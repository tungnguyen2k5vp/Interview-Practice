import { randomInt, randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { exercises } from './grader.mjs'
import { sqlVariantsV3 } from './sql-variants-v3.mjs'
import { codingVariantsV3 } from './coding-variants-v3.mjs'

const [destination,previous,...extra]=process.argv.slice(2)
if(!destination || extra.length) throw new Error('Usage: node worker/prepare-tests.mjs <new private file> [previous private file]')
const id=randomInt(1000,50000), n=randomInt(10,90), m=randomInt(100,200)
const word=randomBytes(6).toString('hex')
const codes=[word+'b',word,word+'c',word]
const sample=(args,expected)=>({input:args.map(x=>JSON.stringify(x)).join(', '),output:JSON.stringify(expected)})
const coding={
  ...codingVariantsV3(n,m,word),
  'crm-canonical-tags':sample([[' '+word,word.toUpperCase(),' ',word+'b']],[word,word+'b']),
  'debug-page-offset':sample([1000000000+n,m],(999999999+n)*m),
  'debug-api-segments':sample(['/api'+word],false),
  'debug-retry-delay':sample([n,randomInt(32,200),m],m),
  'debug-copy-buffer':sample([[m,0,n],randomInt(4,15)],[m,0,n]),
  'frequency-map':sample([codes],[codes[0],codes[2]]),
  'balanced-delimiters':sample([word+'{[(x)]}('],false),
  'unique-window':sample(['aa'+word+'b'],Math.max(...[...('aa'+word+'b')].map((_,i)=> {
    const chars=new Set(); for(const c of ('aa'+word+'b').slice(i)){if(chars.has(c))break;chars.add(c)}return chars.size
  }))),
  'merge-ranges':sample([[[n+2,n+4],[m,m],[n,n+2]]],[[n,n+4],[m,m]]),
  'first-true':sample([[...Array(n).fill(false),true,true]],n),
  'hop-count':sample([5,[[0,1],[1,2],[2,1],[2,4],[0,3]],0,4],3),
  'running-totals':sample([[n,-m,m]],[n,n-m,n]),
  'retry-streak':sample([[200,500,501,404,...Array(n).fill(503),201]],n),
  'stable-intersection':sample([[m,n,m,n,n],[n,n,m]],[m,n,n]),
  'overlapping-bookings':sample([n,m,m-1,m+1],true),
  'reconcile-balances':sample([3,[2,0,2,2],[m,n,-m,n]],[n,0,n])
}
const sql={
  ...sqlVariantsV3(id,n,m),
  'course-vacancies':`INSERT #Courses VALUES (${id},${m}),(${id+1},1); INSERT #Enrollments VALUES (${id},1,1),(${id},2,0);`,
  'learners-across-courses':`INSERT #Enrollments VALUES (10,${id},1),(20,${id},1),(40,${id},0),(50,${id},1);`,
  'customer-orders':`INSERT #Customers VALUES (${id},N'Lan'); INSERT #Orders VALUES (${id},${id},'paid',${n});`,
  'department-salary':`INSERT #Departments VALUES (${id},N'Test'); INSERT #Staff VALUES (${id},${id},${n}.50);`,
  'daily-totals':`INSERT #Receipts VALUES (${id},${id},'2026-03-08T10:30:00',${m},'paid');`,
  'latest-payment':`INSERT #Payments VALUES (${id},201,'2026-03-01T10:00:00',${n});`,
  'unassigned-tickets':`INSERT #Tickets VALUES (${id},N'New'); INSERT #Assignments VALUES (${id},${id},NULL);`,
  'product-sales':`INSERT #Shipments VALUES (${id},8,'2026-03-04T10:00:00',${m});`,
  'above-team-average':`INSERT #Sales VALUES (${id},${id},${n}),(${id+1},${id},${n+1});`,
  'missing-sequence':`INSERT #Invoices VALUES (${id}),(${id+2});`,
  'transfer-atomic':`UPDATE #Bins SET stock=${m} WHERE bin=1;`,
  'stock-threshold-crossings':`INSERT #Stock VALUES (${id},1,5),(${id},3,3);`,
  'unbilled-work':`INSERT #Shifts VALUES (${id},1),(${id+1},1); INSERT #Bills VALUES (${id},${id+1},0);`
}
const pack=previous ? JSON.parse(readFileSync(previous,'utf8')) : {}
if(!pack || typeof pack!=='object' || Array.isArray(pack)) throw new Error('Invalid previous private test pack')
for(const [key,e] of exercises) {
  if(Object.hasOwn(pack,key)){
    if(!Array.isArray(pack[key]) || !pack[key].length) throw new Error('Invalid existing cases for '+key)
    continue
  }
  const fixture=e.kind==='coding'?coding[e.slug]:sql[e.slug]&&{dataset:e.dataset+'\n'+sql[e.slug]}
  if(!fixture || e.version!==1 || e.testVersion!==1) throw new Error('Add a private variant for '+key)
  pack[key]=[fixture]
}
writeFileSync(destination,JSON.stringify(pack),{mode:0o600,flag:'wx'})
console.log('Created private cases for '+Object.keys(pack).length+' exercise versions')
