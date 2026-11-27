export function sqlVariantsV3(id, n, m) {
  if (![id, n, m].every(Number.isSafeInteger)) throw new TypeError('Expected integer fixture seeds')
  const daysLate = 1 + n % 5
  const score = 90 + m % 10
  return {
    'library-overdue-as-of': `INSERT #Loans VALUES
      (${id},${id},1,'20260101',DATEADD(day,-${daysLate},CAST('20260107' AS date)),NULL),
      (${id+1},${id+1},2,'20260102','20260107',NULL),
      (${id+2},${id+2},3,'20260102','20260104','20260107');`,
    'library-loyal-borrowers': `INSERT #Loans VALUES
      (${id},${id},${n},'20260301','20260302','20260302'),
      (${id+1},${id},${n},'20260304','20260305','20260305'),
      (${id+2},${id},${n},'20260308','20260309',NULL),
      (${id+3},${id+1},${n},'20260310','20260311',NULL);`,
    'library-same-day-handoffs': `INSERT #Loans VALUES
      (${id},${id},${n},'20260301','20260304','20260304'),
      (${id+1},${id},${m},'20260304','20260305','20260305'),
      (${id+2},${id},${n},'20260306','20260308',NULL),
      (${id+3},${id+1},${m},'20260305','20260307',NULL);`,
    'library-closing-census': `INSERT #ReportDays VALUES (${id},'20251201'),(${id+1},'20260115');
      INSERT #Loans VALUES (${id},${id},${n},'20260104','20260107','20260107');`,
    'assessment-score-bands': `INSERT #Participants VALUES (${id}),(${id+1}),(${id+2});
      INSERT #Attempts VALUES (${id},10,1,100),(${id+1},10,1,100),(${id+2},10,1,${score}),(${id},10,2,NULL);`,
    'assessment-required-completion': `UPDATE #Assessments SET required = 0;
      INSERT #Participants VALUES (${id});`,
    'assessment-first-last-change': `INSERT #Participants VALUES (${id});
      INSERT #Attempts VALUES (${id},20,1,NULL),(${id},20,3,${score}),(${id},20,5,100),
      (${id},20,8,${n % 60}),(${id},20,9,NULL);`,
    'assessment-grading-desk': `INSERT #Assessments VALUES (${id},0,${score});
      INSERT #Attempts VALUES (1,${id},1,NULL),(1,${id},2,${score}),(1,${id},3,${score-1});`
  }
}
