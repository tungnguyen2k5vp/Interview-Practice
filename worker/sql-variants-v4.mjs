export function sqlVariantsV4(id, n, m) {
  if (![id, n, m].every(Number.isSafeInteger) || id < 1000 || id > 1_000_000 || n < 0 || n > 1_000_000 || m < 0 || m > 1_000_000) {
    throw new TypeError('Expected id in 1000..1000000 and nonnegative integer n,m <=1000000')
  }
  const k = 1_000_000 + id * 100
  const price = 10 + n % 9, qty = 1 + n % 4, cash = 20 + m % 20
  const commerce = `
INSERT #ShopCustomers VALUES (${k},N'Biến thể'),(${k+1},N'Chưa mua');
INSERT #ShopProducts VALUES (${k},N'SKU A'),(${k+1},N'SKU B'),(${k+2},N'Chưa bán');
INSERT #ShopOrders VALUES (${k},${k},'20260115',N'paid'),(${k+1},${k},'20260315',N'paid'),
 (${k+2},${k},'20260215',N'paid'),(${k+3},${k},'20260114',N'paid');
INSERT #ShopLines VALUES (${k},${k},${k},${qty},${price}),(${k+1},${k},${k},1,5),
 (${k+2},${k},${k+1},2,7),(${k+3},${k+1},${k+1},1,9),
 (${k+4},${k+2},${k},1,11),(${k+5},${k+3},${k},2,9);
INSERT #ShopPayments VALUES (${k},${k},'2026-01-15T10:00:00',${cash},N'captured'),
 (${k+1},${k},'2026-01-15T10:00:00',${cash},N'captured'),
 (${k+2},${k},'2026-01-16T10:00:00',-3,N'captured'),
 (${k+3},${k+1},'2026-03-15T10:00:00',999,N'failed');`
  const operations = `
INSERT #OpsMachines VALUES (${k},N'Máy variant');
INSERT #OpsReadings VALUES (${k},${k},'2026-01-01T00:00:00',NULL),
 (${k+1},${k},'2026-01-01T00:10:00',${10+n%10}),(${k+2},${k},'2026-01-01T00:20:00',NULL),
 (${k+3},${k},'2026-01-01T00:30:00',NULL),(${k+4},${k},'2026-01-01T01:00:00',-5),
 (${k+5},${k},'2026-01-03T12:00:00',${50+m%50});
INSERT #OpsStops VALUES (${k},${k},'2025-12-31T23:45:00','2026-01-01T01:00:00'),
 (${k+1},${k},'2026-01-01T00:30:00','2026-01-01T00:45:00'),
 (${k+2},${k},'2026-01-01T00:50:00','2026-01-01T02:00:00'),
 (${k+3},${k},'2026-01-01T02:00:00','2026-01-01T02:15:00');`
  const billing = `
INSERT #BillAccounts VALUES (${k},N'Account variant'),(${k+1},N'Account trống');
INSERT #BillPlans VALUES (${k},${31+n%10}),(${k+1},${5+m%5});
INSERT #BillSubscriptions VALUES (${k},${k},${k},'20260101','20260116'),
 (${k+1},${k},${k+1},'20260116','20260131'),(${k+2},${k},${k},'20260202',NULL);
INSERT #BillInvoices VALUES (${k},${k},'20260101','20260124','20260101','20260301',${50+m%100},0),
 (${k+1},${k},'20260120','20260210','20260120','20260220',20,0);
INSERT #BillReceipts VALUES (${k},${k},'20260125',5),(${k+1},${k},'20260201',10);
INSERT #BillUsage VALUES (${k},${k},'20260101',20),(${k+1},${k},'20260102',1),(${k+2},${k},'20260201',100);`
  const slotValues = Array.from({length:6},(_,i) => {
    const a=9*60+15*i, b=a+15
    const stamp = v => `2026-01-01T${String(Math.floor(v/60)).padStart(2,'0')}:${String(v%60).padStart(2,'0')}:00`
    return `(${k+100+i},${k},'${stamp(a)}','${stamp(b)}')`
  }).join(',')
  const clinic = `
INSERT #ClinicRooms VALUES (${k},N'Phòng variant');
INSERT #ClinicPatients VALUES (${k}),(${k+1}),(${k+2}),(${k+3});
INSERT #ClinicSlots VALUES ${slotValues};
INSERT #ClinicAppointments VALUES
 (${k},${k},${k},'2026-01-01T09:10:00','2026-01-01T09:20:00','20251230',N'completed'),
 (${k+1},${k+1},${k},'2026-01-01T09:20:00','2026-01-01T09:30:00','20251231',N'noshow'),
 (${k+2},${k+1},${k},'2026-01-01T09:30:00','2026-01-01T09:45:00','20251231',N'cancelled'),
 (${k+3},${k+2},${k},'2026-01-01T09:15:00','2026-01-01T09:25:00','20251231',N'scheduled'),
 (${k+4},${k+2},${k},'2026-01-03T23:45:00','2026-01-04T00:15:00','20260102',N'scheduled');
INSERT #ClinicRequests VALUES (${k},${1+n%180}),(${k+1},300);`
  const organisation = `
INSERT #OrgUnits VALUES (${k},7,N'Nhánh variant',${10+n%30}),
 (${k+1},${k},N'Cháu variant',${10+m%50}),(${k+2},11,N'Con link đứt',1);
INSERT #OrgPairs VALUES (${k},${k+1},5),(${k+1},${k+1},${k});
INSERT #OrgDependencies VALUES (4,7),(7,${k}),(${k},${k+1}),(7,${k+1}),(1,${k+1});
INSERT #OrgRoutes VALUES (4,${k}),(${k},4),(5,${k+1}),(${k+1},${k+2});`
  const groups = {
    commerce:['shop-order-balance-ledger','shop-first-purchase-cohorts','shop-unit-weighted-price','shop-product-pair-support','shop-monthly-retention-islands','shop-first-order-revenue-share','shop-catalog-never-completed-sale','shop-charge-allocation-cap'],
    operations:['ops-stop-window-intersection','ops-union-downtime-minutes','ops-reading-sessions','ops-forward-fill-valid-reading','ops-calendar-three-day-average','ops-time-weighted-day-reading','ops-continuous-median','ops-negative-reading-histogram'],
    billing:['billing-january-daily-proration','billing-recognized-service-revenue','billing-graduated-usage-tiers','billing-historical-aging-buckets','billing-reactivation-gaps','billing-contiguous-price-upgrades','billing-month-end-mrr-snapshot','billing-first-daily-quota-crossing'],
    clinic:['clinic-room-overlap-pairs','clinic-contiguous-free-slot-islands','clinic-sweep-peak-concurrency','clinic-best-fit-waitlist-proposal','clinic-settled-no-show-rate','clinic-business-booking-lead-time','clinic-completed-room-utilization','clinic-split-midnight-occupancy'],
    organisation:['org-rooted-unit-paths','org-recursive-subtree-cost','org-lowest-common-ancestor','org-dependency-shortest-hops','org-route-cycle-members','org-import-unrooted-components','org-dag-transitive-reduction']
  }
  const suffixes={commerce,operations,billing,clinic,organisation}
  return Object.fromEntries(Object.entries(groups).flatMap(([key,slugs])=>slugs.map(slug=>[slug,suffixes[key]])))
}
