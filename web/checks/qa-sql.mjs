import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'

export function updateQaDb(query){
  assert.equal(process.env.IP_QA_DB,'InterviewPractice_QA')
  const sqlArgs=['-S','localhost','-C','-b','-d',process.env.IP_QA_DB,'-Q',query]
  const container=process.env.IP_QA_SQL_CONTAINER
  if(container)execFileSync('docker',['exec','-e','SQLCMDPASSWORD',container,'/opt/mssql-tools18/bin/sqlcmd','-U','sa',...sqlArgs],{stdio:'pipe'})
  else execFileSync('sqlcmd',['-E',...sqlArgs],{stdio:'pipe'})
}
