export function summary(data,month){
 const transactions=data.transactions.filter(t=>t.date.startsWith(month));
 const income=transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
 const spending=transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
 const bills=data.bills.filter(b=>b.date.startsWith(month));
 const paid=bills.filter(b=>b.paid).reduce((s,b)=>s+b.amount,0);
 const unpaid=bills.filter(b=>!b.paid).reduce((s,b)=>s+b.amount,0);
 return {income,spending,paid,unpaid,available:income-spending-paid-unpaid,bills};
}
export function validData(d){return !!d&&d.version===1&&Array.isArray(d.categories)&&d.categories.length>0&&d.categories.every(c=>typeof c==='string'&&c.trim()&&c.length<=60)&&new Set(d.categories).size===d.categories.length&&Array.isArray(d.transactions)&&Array.isArray(d.bills)&&d.transactions.every(t=>validEntry(t)&&['income','expense'].includes(t.type)&&d.categories.includes(t.category))&&d.bills.every(b=>validEntry(b)&&typeof b.paid==='boolean')&&d.budgets&&typeof d.budgets==='object'&&!Array.isArray(d.budgets)&&Object.entries(d.budgets).every(([c,n])=>d.categories.includes(c)&&Number.isFinite(n)&&n>=0)&&new Set([...d.transactions,...d.bills].map(x=>x.id)).size===d.transactions.length+d.bills.length;}
function validEntry(t){return t&&typeof t.id==='string'&&typeof t.name==='string'&&t.name.trim()&&t.name.length<=100&&Number.isFinite(t.amount)&&t.amount>0&&typeof t.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(t.date)&&!isNaN(Date.parse(t.date))&&new Date(t.date).toISOString().slice(0,10)===t.date;}
