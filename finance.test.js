import test from 'node:test';
import assert from 'node:assert/strict';
import {summary,validData,escapeHtml} from './finance.js';
const data={version:1,categories:['Food','Income'],budgets:{Food:200},transactions:[{id:'1',name:'Salary',amount:3000,type:'income',category:'Income',date:'2026-10-01'},{id:'2',name:'Food',amount:150,type:'expense',category:'Food',date:'2026-10-03'},{id:'3',name:'Other month',amount:500,type:'expense',category:'Food',date:'2026-09-03'}],bills:[{id:'4',name:'Rent',amount:1000,date:'2026-10-01',paid:true},{id:'5',name:'Internet',amount:50,date:'2026-10-20',paid:false}]};
test('available cash reserves unpaid bills and excludes other months',()=>{assert.deepEqual({...summary(data,'2026-10'),bills:[]},{income:3000,spending:150,paid:1000,unpaid:50,available:1800,bills:[]});});
test('paying a bill does not double deduct cash',()=>{const next=structuredClone(data);next.bills[1].paid=true;assert.equal(summary(next,'2026-10').available,1800);assert.equal(summary(next,'2026-10').unpaid,0);});
test('empty month returns zero',()=>assert.equal(summary(data,'2026-11').available,0));
test('backup round trip passes validation',()=>assert.ok(validData(JSON.parse(JSON.stringify(data)))));
test('reject malformed financial backups',()=>{for(const mutate of [d=>d.transactions[0].amount=-1,d=>d.transactions[0].date='2026-02-30',d=>d.bills[0].paid='yes',d=>d.transactions[0].category='Unknown',d=>d.bills[0].id='1',d=>d.budgets.Food=-1]){const next=structuredClone(data);mutate(next);assert.equal(validData(next),false);}assert.equal(validData(null),false);});

test('escape user-controlled text and attribute delimiters',()=>{assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');assert.equal(escapeHtml("A&B's"),'A&amp;B&#39;s');});
test('reject category names that collide with object internals',()=>{for(const name of ['__proto__','constructor','prototype']){const next=structuredClone(data);next.categories.push(name);assert.equal(validData(next),false);}});
