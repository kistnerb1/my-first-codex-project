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

export const exampleBudgets=Object.freeze({Groceries:600,'Dining out':250,Shopping:300,Transport:200,Entertainment:150,Health:100});
const exampleTransactions=[
 ['Monthly salary',5800,'01','Income','income'],['Freelance project',650,'05','Income','income'],
 ['Whole Foods Market',128.5,'03','Groceries','expense'],['Weekly groceries',216.75,'08','Groceries','expense'],
 ['Neighborhood coffee',24,'04','Dining out','expense'],['Dinner with friends',86,'07','Dining out','expense'],
 ['New everyday essentials',182,'06','Shopping','expense'],['Gas & transit',95,'09','Transport','expense'],
 ['Movie night',42,'10','Entertainment','expense'],['Pharmacy',35,'11','Health','expense']
];
const exampleBills=[['Rent',1650,'01',true],['Internet',65,'12',true],['Electricity',92,'20',false],['Car insurance',135,'25',false]];
// Legacy unmarked matches are ambiguous: exclude from migration, never delete locally.
export function isPossibleSampleEntry(entry,type){
 if(entry.isSample===true)return true;
 const day=entry.date.slice(8);
 return type==='transactions'?exampleTransactions.some(([name,amount,d,category,t])=>entry.name===name&&entry.amount===amount&&day===d&&entry.category===category&&entry.type===t):exampleBills.some(([name,amount,d,paid])=>entry.name===name&&entry.amount===amount&&day===d&&entry.paid===paid);
}
