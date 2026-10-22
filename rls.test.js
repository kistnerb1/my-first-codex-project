import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {emptyWorkspace} from './cloud.js';

test('PostgreSQL RLS: anonymous denied; two users cannot read, insert, update, delete, or reassign each other’s records',async()=>{
 const db=new PGlite();
 try{
  // Emulates Supabase's auth schema and PostgREST JWT claim setting, not its hosted Auth service.
  await db.exec(`create schema auth; create role anon; create role authenticated; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$; grant usage on schema auth,public to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`);
  await db.exec(await readFile(new URL('./supabase/schema.sql',import.meta.url),'utf8'));
  const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
  await db.query('insert into auth.users values ($1),($2)',[a,b]);
  const asUser=async id=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');};
  const insert=async id=>db.query('insert into public.money_workspaces(user_id,data) values($1,$2::jsonb) returning revision',[id,JSON.stringify(emptyWorkspace())]);
  await db.exec('set role authenticated');assert.equal((await db.query('select * from public.money_workspaces')).rows.length,0);await assert.rejects(()=>insert(a),/row-level security/);await asUser(a);assert.equal((await insert(a)).rows[0].revision,1);
  await assert.rejects(()=>insert(b),/row-level security/);
  await asUser(b);assert.equal((await db.query('select * from public.money_workspaces')).rows.length,0);await insert(b);
  assert.equal((await db.query('select user_id from public.money_workspaces')).rows[0].user_id,b);
  assert.equal((await db.query('update public.money_workspaces set data=data where user_id=$1 returning *',[a])).rows.length,0);
  assert.equal((await db.query('delete from public.money_workspaces where user_id=$1 returning *',[a])).rows.length,0);
  await assert.rejects(()=>db.query('update public.money_workspaces set user_id=$1 where user_id=$2',[a,b]),/Owner cannot change|row-level security/);
  const own=await db.query('update public.money_workspaces set data=data,revision=999 where user_id=$1 and revision=1 returning revision',[b]);assert.equal(own.rows[0].revision,2);
  assert.equal((await db.query('update public.money_workspaces set data=data where user_id=$1 and revision=1 returning *',[b])).rows.length,0);
  await assert.rejects(()=>db.query("update public.money_workspaces set data='{}' where user_id=$1",[b]),/workspace_shape/);
  assert.equal((await db.query('delete from public.money_workspaces where user_id=$1 returning *',[b])).rows.length,1);
  await db.exec('reset role; set role anon');
  for(const sql of ['select * from public.money_workspaces',"insert into public.money_workspaces(data) values('{}')",'update public.money_workspaces set data=data','delete from public.money_workspaces'])await assert.rejects(()=>db.exec(sql),/permission denied/);
  await db.exec('reset role');const rows=await db.query('select user_id from public.money_workspaces');assert.equal(rows.rows.length,1);assert.equal(rows.rows[0].user_id,a);
 }finally{await db.close();}
});
