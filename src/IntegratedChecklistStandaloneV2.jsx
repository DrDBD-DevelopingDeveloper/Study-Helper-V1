
import React, { useEffect, useState } from 'react';

const START = new Date('2025-11-24T00:00:00');
const TARGET = new Date('2025-12-17T23:59:59');

const EXAMS_INIT = [
  { code: 'MATH F211', date: '2025-12-01T09:30:00' },
  { code: 'ECON F211', date: '2025-12-03T09:30:00' },
  { code: 'MAC F214', date: '2025-12-05T14:00:00' },
  { code: 'MAC F213', date: '2025-12-08T14:00:00' },
  { code: 'MAC F211', date: '2025-12-10T09:30:00' },
  { code: 'MAC F212', date: '2025-12-13T14:00:00' },
  { code: 'ECON F212', date: '2025-12-16T14:00:00' }
];

const FILES = {
  messImage: '/IMG_4113.JPG',
  fullPlan: '/Full_Daywise_Plan_Reallocated.pdf',
  deepPlan: '/Deep_Study_Diet_Workout_Plan.pdf',
  studyPlan: '/Study_Plan.pdf'
};

const SUBJECT_PRIORITY = {
  'MAC F211': 18,
  'MAC F212': 4,
  'MAC F213': 13,
  'MAC F214': 9,
  'MATH F211': -4,
  'ECON F211': 17,
  'ECON F212': 20
};

function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function uid() { return Math.random().toString(36).slice(2,9); }
function fmt(d) { const D = new Date(d); return D.toDateString(); }

function generateDateList(start, end) {
  const out = [];
  let cur = new Date(start);
  cur.setHours(0,0,0,0);
  while (cur <= end) { out.push(new Date(cur)); cur = addDays(cur,1); }
  return out;
}

function seedDefaultTasks(date, idx) {
  const sorted = Object.keys(SUBJECT_PRIORITY).sort((a,b)=> SUBJECT_PRIORITY[b]-SUBJECT_PRIORITY[a]);
  const s1 = sorted[idx % sorted.length];
  const s2 = sorted[(idx+1) % sorted.length];
  const tasks = [];
  const ex = EXAMS_INIT.find(e => new Date(e.date).toDateString() === new Date(date).toDateString());
  if (ex) tasks.push({ id: uid(), title: `EXAM DAY: ${ex.code} — past-paper + formula`, type: 'study', est:120, done:false, exam:true });
  tasks.push({ id: uid(), title: `Practice problems: ${s1}`, type: 'study', est:90, done:false });
  tasks.push({ id: uid(), title: `Concept drill: ${s2}`, type: 'study', est:60, done:false });
  tasks.push({ id: uid(), title: `Quick formulas rotate`, type: 'study', est:30, done:false });
  tasks.push({ id: uid(), title: `Workout: 20-30 min`, type: 'fitness', est:25, done:false });
  tasks.push({ id: uid(), title: `Diet: Whey + 2 eggs`, type: 'fitness', est:5, done:false });
  return tasks;
}

export default function IntegratedChecklistStandaloneV2() {
  const dateList = generateDateList(START, TARGET);

  const [exams, setExams] = useState(() => {
    const saved = localStorage.getItem('ics_exams_v3');
    if (saved) return JSON.parse(saved);
    return EXAMS_INIT.map(e => ({ ...e, completed: false }));
  });

  const [days, setDays] = useState(() => {
    const saved = localStorage.getItem('ics_days_v3');
    if (saved) return JSON.parse(saved);
    return dateList.map((d, i) => ({ date: d.toISOString(), tasks: seedDefaultTasks(d, i), notes: '' }));
  });

  const [sel, setSel] = useState(0);
  const [msg, setMsg] = useState('');

  useEffect(() => { localStorage.setItem('ics_exams_v3', JSON.stringify(exams)); }, [exams]);
  useEffect(() => { localStorage.setItem('ics_days_v3', JSON.stringify(days)); }, [days]);

  function toggleTask(dayIdx, taskId) {
    setDays(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const t = copy[dayIdx].tasks.find(x=>x.id===taskId);
      if (t) t.done = !t.done;
      return copy;
    });
  }

  function endDayRoll(dayIdx) {
    setDays(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const day = copy[dayIdx];
      const incomplete = day.tasks.filter(t=>!t.done && t.type==='study');
      if (incomplete.length===0) { setMsg('No incomplete study tasks to roll.'); return copy; }
      const nextIdx = Math.min(dayIdx+1, copy.length-1);
      incomplete.forEach(task => {
        if (!copy[nextIdx].tasks.some(t=>t.title===task.title)) {
          copy[nextIdx].tasks.unshift({...task, id: uid(), done:false, rolled:true});
        }
      });
      day.tasks = day.tasks.map(t => t.done ? t : {...t, rolled:true});
      setMsg(`Rolled ${incomplete.length} study task(s) to ${fmt(copy[nextIdx].date)}.`);
      return copy;
    });
  }

  function toggleExamCompleted(code) {
    setExams(prev => prev.map(e => e.code===code ? {...e, completed: !e.completed} : e));
    setMsg(`Toggled completion for ${code}. Re-run generator to reallocate.`);
  }

  function generateStrictTimetableConsideringExams() {
    setDays(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy.forEach((d, idx) => {
        const currentDate = new Date(d.date);
        if (currentDate >= new Date('2025-11-25') && currentDate <= new Date('2025-12-16')) {
          const upcoming = exams.find(ex => new Date(ex.date) >= currentDate && !ex.completed);
          const sorted = Object.keys(SUBJECT_PRIORITY).sort((a,b)=> SUBJECT_PRIORITY[b]-SUBJECT_PRIORITY[a]);
          let top1 = sorted[0];
          let top2 = sorted[1] || sorted[0];
          if (upcoming) {
            top1 = upcoming.code;
            top2 = sorted.find(s=>s!==top1) || sorted[0];
          }
          const slots = [];
          slots.push({ id: uid(), title: `Focus: ${top1} — past paper / formula revision`, type:'study', est:120, done:false, exam: upcoming ? upcoming.code===top1 : false });
          slots.push({ id: uid(), title: `Practice: ${top2} — problem set`, type:'study', est:90, done:false });
          slots.push({ id: uid(), title: `Drill: ${sorted[(idx+2)%sorted.length]} — concepts`, type:'study', est:60, done:false });
          slots.push({ id: uid(), title: `Quick: ${sorted[(idx+3)%sorted.length]} — formula`, type:'study', est:30, done:false });
          const fitness = d.tasks.filter(t=>t.type==='fitness');
          d.tasks = [...slots, ...fitness];
        }
      });
      setMsg('Generated strict timetable (now respecting completed/past exams).');
      return copy;
    });
  }

  function openFile(key) { window.open(FILES[key], '_blank'); }

  return (
    <div style={{fontFamily:'Inter, Arial, sans-serif', padding:16, background:'#f6f7fb'}}>
      <h1 style={{margin:0}}>Integrated Study & Cut — v2</h1>
      <p style={{color:'#444'}}>Now with exam completion toggles. When an exam is marked DONE, re-run the generator and that exam's slots will be redistributed to other subjects.</p>

      <div style={{display:'grid', gridTemplateColumns:'320px 1fr', gap:16, alignItems:'start'}}>
        <aside style={{background:'#fff',padding:12,borderRadius:8}}>
          <h3>Exams (mark done when complete)</h3>
          <ul>
            {exams.map(e=> (
              <li key={e.code} style={{marginBottom:6}}>
                <label style={{display:'flex',alignItems:'center',gap:8}}>
                  <input type='checkbox' checked={!!e.completed} onChange={()=>toggleExamCompleted(e.code)} />
                  <div>
                    <div style={{fontWeight:600}}>{e.code}</div>
                    <div style={{fontSize:12,color:'#666'}}>{new Date(e.date).toLocaleString()}</div>
                  </div>
                </label>
              </li>
            ))}
          </ul>

          <div style={{marginTop:12}}>
            <button onClick={generateStrictTimetableConsideringExams} style={{width:'100%',padding:8,background:'#1f6feb',color:'#fff',border:'none',borderRadius:6}}>Generate strict timetable (Nov25–Dec16)</button>
          </div>

          <div style={{marginTop:12}}>
            <h4>Downloads</h4>
            <button onClick={()=>openFile('fullPlan')} style={{width:'100%',padding:8,marginBottom:6}}>Open full daywise PDF</button>
            <button onClick={()=>openFile('deepPlan')} style={{width:'100%',padding:8,marginBottom:6}}>Open expanded PDF</button>
            <button onClick={()=>openFile('studyPlan')} style={{width:'100%',padding:8}}>Open summary PDF</button>
          </div>

          <div style={{marginTop:12}}>
            <h4>Diet & Workout (short)</h4>
            <p style={{fontSize:13}}>1800–2000 kcal • 120–150g protein • Whey + 2 eggs daily • Chapati over rice • No fried snacks</p>
            <p style={{fontSize:13}}><b>Workout</b>: Mon/Wed/Fri walk 20–30m; Tue/Thu dumbbells; Sat light circuit</p>
          </div>

          <div style={{marginTop:12}}>
            <img src={FILES.messImage} alt='mess' style={{width:'100%',borderRadius:6}} />
          </div>
        </aside>

        <main style={{background:'#fff',padding:12,borderRadius:8}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <h2 style={{margin:0}}>Day list — {fmt(days[sel].date)}</h2>
              <div style={{color:'#666',fontSize:13}}>Toggle tasks as you complete them. Use End Day & Roll to push unfinished study tasks forward.</div>
            </div>
            <div><small style={{color:'#888'}}>{new Date(START).toLocaleDateString()} → {new Date(TARGET).toLocaleDateString()}</small></div>
          </div>

          <div style={{display:'flex',gap:12,marginTop:12}}>
            <div style={{width:240,maxHeight:560,overflowY:'auto'}}>
              {days.map((d,i)=> (
                <div key={d.date} onClick={()=>setSel(i)} style={{padding:8,marginBottom:6,borderRadius:6,background:i===sel?'#eef7ff':'#fff',cursor:'pointer',border:'1px solid #e6eefb'}}>
                  <div style={{fontWeight:600}}>{fmt(d.date)}</div>
                  <div style={{fontSize:12,color:'#666'}}>{d.tasks.filter(t=>t.done).length}/{d.tasks.length} done</div>
                </div>
              ))}
            </div>

            <div style={{flex:1,maxHeight:560,overflowY:'auto'}}>
              <div style={{padding:10,border:'1px solid #eef3ff',borderRadius:8,background:'#fafcff'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <h3 style={{margin:0}}>{fmt(days[sel].date)}</h3>
                    <div style={{fontSize:13,color:'#666'}}>Tasks</div>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>endDayRoll(sel)} style={{padding:'6px 8px',background:'#ff6b6b',color:'#fff',border:'none',borderRadius:4}}>End Day & Roll</button>
                    <button onClick={()=>{navigator.clipboard.writeText(days[sel].tasks.map(t=>t.title).join('\\n')); setMsg('Copied tasks to clipboard');}} style={{padding:'6px 8px'}}>Copy</button>
                  </div>
                </div>

                <div style={{marginTop:10}}>
                  {days[sel].tasks.map(t=> (
                    <div key={t.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:8,background:'#fff',border:'1px solid #eef3ff',borderRadius:6,marginBottom:8}}>
                      <label style={{display:'flex',gap:8,alignItems:'center'}}>
                        <input type='checkbox' checked={!!t.done} onChange={()=>toggleTask(sel,t.id)} />
                        <div>
                          <div style={{fontWeight:700}}>{t.title} {t.exam? <small style={{color:'#c44'}}>• exam-slot</small>:null} {t.rolled? <small style={{color:'#c44'}}>• carried</small>:null}</div>
                          <div style={{fontSize:12,color:'#666'}}>{t.type} • {t.est} mins</div>
                        </div>
                      </label>
                      <div style={{fontSize:12,color:t.done?'#2a8':'#888'}}>{t.done?'Done':'Pending'}</div>
                    </div>
                  ))}
                </div>

                <div style={{marginTop:8}}>
                  <strong>Notes</strong>
                  <div style={{marginTop:6}}>
                    <textarea value={days[sel].notes} onChange={(e)=>{ const v=e.target.value; setDays(prev=>{ const copy=JSON.parse(JSON.stringify(prev)); copy[sel].notes=v; return copy; }); }} style={{width:'100%',minHeight:80,padding:8}} />
                  </div>
                </div>

              </div>

              <div style={{marginTop:12}}>
                <h4>Exam quick view</h4>
                <ul>
                  {exams.map(x=>(<li key={x.code}>{x.code} — {new Date(x.date).toLocaleString()} {x.completed? <strong style={{color:'#0a8'}}>• DONE</strong>:null}</li>))}
                </ul>

                <div style={{marginTop:8}}>
                  <button onClick={()=>openFile('fullPlan')} style={{padding:8,marginRight:8}}>Open Full Daywise PDF</button>
                  <button onClick={()=>openFile('deepPlan')} style={{padding:8,marginRight:8}}>Open Expanded PDF</button>
                  <button onClick={()=>openFile('studyPlan')} style={{padding:8}}>Open Summary PDF</button>
                </div>
              </div>

              {msg && <div style={{marginTop:10,padding:8,background:'#fffbe6',border:'1px solid #ffecb3'}}>{msg}</div>}
            </div>
          </div>
        </main>
      </div>

      <footer style={{marginTop:16,fontSize:13,color:'#666'}}>If local PDFs fail to open, check app's access to /public paths. Persistence keys: 'ics_days_v3' and 'ics_exams_v3'.</footer>
    </div>
  );
}
