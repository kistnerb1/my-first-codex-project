export function summary(data,month){
 const transactions=data.transactions.filter(t=>t.date.startsWith(month));
 const income=transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
 const spending=transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
 const bills=data.bills.filter(b=>b.date.startsWith(month));
 const paid=bills.filter(b=>b.paid).reduce((s,b)=>s+b.amount,0);
 const unpaid=bills.filter(b=>!b.paid).reduce((s,b)=>s+b.amount,0);
 return {income,spending,paid,unpaid,available:income-spending-paid-unpaid,bills};
}
export function validData(d){return !!d&&d.version===1&&Array.isArray(d.categories)&&d.categories.length>0&&d.categories.every(c=>typeof c==='string'&&!['__proto__','constructor','prototype'].includes(c)&&c.trim()&&c.length<=60)&&new Set(d.categories).size===d.categories.length&&Array.isArray(d.transactions)&&Array.isArray(d.bills)&&d.transactions.every(t=>validEntry(t)&&['income','expense'].includes(t.type)&&d.categories.includes(t.category))&&d.bills.every(b=>validEntry(b)&&typeof b.paid==='boolean')&&d.budgets&&typeof d.budgets==='object'&&!Array.isArray(d.budgets)&&Object.entries(d.budgets).every(([c,n])=>d.categories.includes(c)&&Number.isFinite(n)&&n>=0)&&new Set([...d.transactions,...d.bills].map(x=>x.id)).size===d.transactions.length+d.bills.length;}
function validEntry(t){return t&&typeof t.id==='string'&&typeof t.name==='string'&&t.name.trim()&&t.name.length<=100&&Number.isFinite(t.amount)&&t.amount>0&&typeof t.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(t.date)&&!isNaN(Date.parse(t.date))&&new Date(t.date).toISOString().slice(0,10)===t.date;}

// Escape all user-provided text before inserting it into HTML or attributes.
export function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

// Metadata marks generated examples; unmarked older records are never deleted by default.
export function clearSamples(data,selection){
 const next=structuredClone(data);
 next.transactions=next.transactions.filter(t=>!selection.transactions.includes(t.id));
 next.bills=next.bills.filter(b=>!selection.bills.includes(b.id));
 for(const category of selection.budgets){delete next.budgets[category];if(next.sampleBudgets)delete next.sampleBudgets[category];}
 next.sample=false;
 return next;
}
