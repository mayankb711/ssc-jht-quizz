(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const o of s)if(o.type==="childList")for(const r of o.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&n(r)}).observe(document,{childList:!0,subtree:!0});function i(s){const o={};return s.integrity&&(o.integrity=s.integrity),s.referrerPolicy&&(o.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?o.credentials="include":s.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(s){if(s.ep)return;s.ep=!0;const o=i(s);fetch(s.href,o)}})();const ut="sscjht",pt=2;let ee=null;function Be(){return ee?Promise.resolve(ee):new Promise((e,t)=>{const i=indexedDB.open(ut,pt);i.onupgradeneeded=()=>{const n=i.result;n.objectStoreNames.contains("kv")||n.createObjectStore("kv"),n.objectStoreNames.contains("attempts")||n.createObjectStore("attempts",{keyPath:"id"}),n.objectStoreNames.contains("cache")||n.createObjectStore("cache"),n.objectStoreNames.contains("generated_questions")||n.createObjectStore("generated_questions",{keyPath:"id"})},i.onsuccess=()=>{ee=i.result,e(ee)},i.onerror=()=>t(i.error)})}async function M(e,t){return(await Be()).transaction(e,t).objectStore(e)}async function m(e,t=null){const i=await M("kv","readonly");return new Promise(n=>{const s=i.get(e);s.onsuccess=()=>n(s.result??t),s.onerror=()=>n(t)})}async function y(e,t){const i=await M("kv","readwrite");return new Promise((n,s)=>{const o=i.put(t,e);o.onsuccess=()=>n(t),o.onerror=()=>s(o.error)})}async function Ne(e){const t=await M("attempts","readwrite");return new Promise((i,n)=>{const s=t.add(e);s.onsuccess=()=>i(e),s.onerror=()=>n(s.error)})}async function j(){const e=await M("attempts","readonly");return new Promise(t=>{const i=e.getAll();i.onsuccess=()=>t(i.result||[]),i.onerror=()=>t([])})}async function re(e){const n=(await Be()).transaction("attempts","readwrite").objectStore("attempts");await new Promise((s,o)=>{const r=n.clear();r.onsuccess=()=>s(),r.onerror=()=>o(r.error)});for(const s of e||[])!s||!s.id||await new Promise((o,r)=>{const a=n.put(s);a.onsuccess=()=>o(),a.onerror=()=>r(a.error)})}async function Ae(e){const t=await M("cache","readonly");return new Promise(i=>{const n=t.get(e);n.onsuccess=()=>i(n.result??null),n.onerror=()=>i(null)})}async function Se(e,t){const i=await M("cache","readwrite");return new Promise(n=>{const s=i.put(t,e);s.onsuccess=()=>n(t),s.onerror=()=>n(null)})}async function Te(e){try{const t=await M("generated_questions","readwrite");return new Promise((i,n)=>{const s=t.put(e);s.onsuccess=()=>i(e),s.onerror=()=>n(s.error)})}catch{return e}}async function le(){try{const e=await M("generated_questions","readonly");return new Promise(t=>{const i=e.getAll();i.onsuccess=()=>t(i.result||[]),i.onerror=()=>t([])})}catch{return[]}}const mt=Object.freeze(Object.defineProperty({__proto__:null,addAttempt:Ne,allAttempts:j,allGeneratedQuestions:le,cacheGet:Ae,cacheSet:Se,kvGet:m,kvSet:y,replaceAttempts:re,upsertGeneratedQuestion:Te},Symbol.toStringTag,{value:"Module"}));let O=null,S=null,N=!1,K=0,ne=[],z=navigator.onLine;window.addEventListener("online",()=>{z=!0,H()});window.addEventListener("offline",()=>{z=!1,H()});function ft(e){return ne.push(e),()=>{ne=ne.filter(t=>t!==e)}}function H(){ne.forEach(e=>e(qe()))}function qe(){return{configured:!!O,signedIn:!!S,user:S?{id:S}:null,syncInProgress:N,lastSyncTs:K,lastSyncAt:K?new Date(K).toLocaleString():null,online:z}}async function ht(){let e=await m("firebase_device_id");return e||(e="dev_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,10),await y("firebase_device_id",e)),e}function gt(e){return"https://firestore.googleapis.com/v1/projects/"+encodeURIComponent(e)+"/databases/(default)/documents"}function yt(e,t,i){return gt(e)+"/"+encodeURIComponent(t)+"/"+encodeURIComponent(i)+"?key="+encodeURIComponent(O.apiKey)}function Fe(e){var i,n;const t={};for(const[s,o]of Object.entries(e||{}))o.stringValue!==void 0?t[s]=o.stringValue:o.integerValue!==void 0?t[s]=parseInt(o.integerValue,10):o.doubleValue!==void 0?t[s]=o.doubleValue:o.booleanValue!==void 0?t[s]=o.booleanValue:(i=o.arrayValue)!=null&&i.values?t[s]=o.arrayValue.values.map(r=>r.stringValue!==void 0?r.stringValue:r.integerValue!==void 0?parseInt(r.integerValue,10):r):(n=o.mapValue)!=null&&n.fields&&(t[s]=Fe(o.mapValue.fields));return t}function vt(e){const t={};for(const[i,n]of Object.entries(e||{}))n!=null&&(typeof n=="string"?t[i]={stringValue:n}:typeof n=="number"?t[i]=Number.isInteger(n)?{integerValue:String(n)}:{doubleValue:n}:typeof n=="boolean"?t[i]={booleanValue:n}:Array.isArray(n)&&(t[i]={arrayValue:{values:n.map(s=>typeof s=="string"?{stringValue:s}:typeof s=="number"?{integerValue:String(s)}:{stringValue:JSON.stringify(s)})}}));return t}async function bt(){const e=await m("fb_project_id"),t=await m("fb_api_key");if(!e||!t)return O=null,S=null,H(),!1;try{return O={projectId:e,apiKey:t},S=await ht(),H(),!0}catch(i){return console.warn("Firebase configure failed:",i),O=null,S=null,H(),!1}}async function de(){K=Date.now(),await y("firebase_last_sync_ts",K),H()}async function Ve(){return yt(O.projectId,"users",S)}async function ue(){const e=await Ve(),t=await fetch(e);if(t.status===404)return null;if(!t.ok)throw new Error("Firestore read failed: "+t.status);const i=await t.json();return Fe(i.fields)}async function ze(e){const t={fields:vt(e)},i=await fetch(await Ve(),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});if(!i.ok)throw new Error("Firestore write failed: "+i.status);return i.json()}async function wt(e){if(await Ne(e),!(!O||!S||!z))try{const t=await ue(),i=t!=null&&t.attempts?JSON.parse(t.attempts):[];i.push(e),await ze({attempts:JSON.stringify(i),ts:new Date().toISOString(),settings:(t==null?void 0:t.settings)||"{}",questions:(t==null?void 0:t.questions)||"[]",bookmarks:(t==null?void 0:t.bookmarks)||"[]"}),await de()}catch(t){console.warn("Firebase recordAttempt failed:",t)}}async function _t(){if(!(!O||!S||!z))try{const e=await ue();if(!(e!=null&&e.attempts))return;const t=JSON.parse(e.attempts);if(!t.length)return;const i=new Map((await j()).map(s=>[s.id,s]));let n=!1;for(const s of t){const o=i.get(s.id);(!o||(s.ts||0)>=(o.ts||0))&&(i.set(s.id,s),n=!0)}n&&await re([...i.values()]),await de()}catch(e){console.warn("Firebase fetchAttempts failed:",e)}}async function Ge(){if(!(!O||!S||!z))try{const e=await ue();if(!e)return;if(e.attempts){const t=JSON.parse(e.attempts);if(t.length){const i=new Map((await j()).map(s=>[s.id,s]));let n=!1;for(const s of t){const o=i.get(s.id);(!o||(s.ts||0)>=(o.ts||0))&&(i.set(s.id,s),n=!0)}n&&await re([...i.values()])}}if(e.settings){const t=JSON.parse(e.settings);t.theme&&(await y("theme",t.theme),document.documentElement.setAttribute("data-theme",t.theme)),t.neuron_cap&&await y("neuron_cap",t.neuron_cap)}if(e.questions){const t=JSON.parse(e.questions);for(const i of t)i!=null&&i.id&&await Te(i)}if(e.bookmarks){const t=JSON.parse(e.bookmarks);Array.isArray(t)&&t.length&&await y("bookmarks",t)}await de()}catch(e){console.warn("Firebase readAllAndMerge failed:",e)}}async function kt(){if(!O)return{ok:!1,reason:"not-configured"};if(!S)return{ok:!1,reason:"no-session"};if(N)return{ok:!1,reason:"sync-in-progress"};N=!0,H();try{const e=await m("firebase_last_sync_ts",0),t=(await j()).filter(f=>f.ts>e),i={theme:await m("theme","dark"),neuron_cap:await m("neuron_cap",8e3)},n=await le(),s=await m("bookmarks",[]),o=await ue(),r=o!=null&&o.attempts?JSON.parse(o.attempts):[],a=o!=null&&o.questions?JSON.parse(o.questions):[],c=De(r,t,"id"),l=De(a,n,"id");return await ze({attempts:JSON.stringify(c),settings:JSON.stringify(i),questions:JSON.stringify(l),bookmarks:JSON.stringify(s),ts:new Date().toISOString()}),await de(),{ok:!0,pushed:t.length,total:t.length}}catch(e){return{ok:!1,reason:e.message}}finally{N=!1,H()}}async function Et(){if(!O)return{ok:!1,reason:"not-configured"};if(!S)return{ok:!1,reason:"no-session"};if(N)return{ok:!1,reason:"sync-in-progress"};N=!0,H();try{return await Ge(),{ok:!0}}catch(e){return{ok:!1,reason:e.message}}finally{N=!1,H()}}async function At(){S&&await Ge()}function De(e,t,i){const n=new Map;for(const s of[...e||[],...t||[]])s&&s[i]&&n.set(s[i],s);return[...n.values()]}let we="local",I={configured:!1,signedIn:!1,user:null},ae=[];function St(e){return ae.push(e),ft(_e),()=>{ae=ae.filter(t=>t!==e)}}function _e(){I=B(),ae.forEach(e=>e(I))}function B(){return{provider:we,configured:I.configured,signedIn:I.signedIn,user:I.user,syncInProgress:I.syncInProgress,lastSyncTs:I.lastSyncTs,lastSyncAt:I.lastSyncAt,online:I.online}}async function xe(){return await bt()?(we="firebase",I=qe(),_e(),!0):(we="local",I={configured:!1,signedIn:!1,user:null,syncInProgress:!1,lastSyncTs:0,lastSyncAt:null,online:navigator.onLine},_e(),!1)}function Tt(e){return wt(e)}function Qe(){return _t()}function xt(){return kt()}function $t(){return Et()}function It(){return At()}const G="error_reports";function Je(e){return{id:e.id||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`,ts:e.ts||Date.now(),title:e.title||"Runtime error",message:e.message||"",stack:e.stack||"",url:e.url||location.href,screen:e.screen||new URLSearchParams(location.hash.replace(/^#/,"")).get("screen")||"home",recoverySteps:Array.isArray(e.recoverySteps)?e.recoverySteps:[],resolved:!!e.resolved}}async function Q(){return await m(G,[])||[]}async function Ot(e){await y(G,Array.isArray(e)?e.map(Je):[])}async function We(e,t={}){const i=await Q(),n=Je({title:t.title||"Runtime error",message:t.message||String((e==null?void 0:e.message)||e||"Unknown error"),stack:t.stack||String((e==null?void 0:e.stack)||""),recoverySteps:t.recoverySteps||[],...t});return i.unshift(n),await y(G,i.slice(0,100)),n}async function Ye(e,t){const i=await Q(),n=i.findIndex(s=>s.id===e);n>=0&&(i[n]={...i[n],recoverySteps:[...i[n].recoverySteps||[],t]},await y(G,i))}async function Ke(e,t=!0){const i=await Q(),n=i.findIndex(s=>s.id===e);n>=0&&(i[n]={...i[n],resolved:t},await y(G,i))}async function Xe(){await y(G,[])}const Rt=Object.freeze(Object.defineProperty({__proto__:null,appendRecovery:Ye,clearReports:Xe,getReports:Q,logError:We,markResolved:Ke,setReports:Ot},Symbol.toStringTag,{value:"Module"})),X={name:"SSC JHT Quiz",subtitle:"Paper 1 practice",defaultTheme:"dark",defaultNeuronCap:8e3};let je=0;function Ht(){return je++,`${Date.now().toString(36)}-${je}-${Math.random().toString(36).slice(2,7)}`}async function Ze({question:e,chosen:t,mode:i}){const n=t===e.answer,s={id:Ht(),question_id:e.id,topic:e.topic,skill:e.skill||null,correct:n,chosen:t,ts:Date.now(),mode:i||"practice"};return await Tt(s),s}const Dt=.25;function et(e){let t=0,i=0,n=0;for(const o of e)o.chosen==null?n++:o.correct?t++:i++;const s=t-Dt*i;return{correct:t,wrong:i,unattempted:n,marks:s,total:e.length}}async function tt(){await Qe();const e=await j();if(!e.length)return{total:0,accuracy:0,streakDays:0,topics:[]};const i=e.filter(c=>c.correct).length/e.length,n=new Set(e.map(c=>new Date(c.ts).toDateString()));let s=0,o=new Date;for(n.has(o.toDateString())||o.setDate(o.getDate()-1);n.has(o.toDateString());)s++,o.setDate(o.getDate()-1);const r=new Map;for(const c of e){const l=r.get(c.topic)||{topic:c.topic,correct:0,total:0};l.total++,c.correct&&l.correct++,r.set(c.topic,l)}const a=[...r.values()].map(c=>({...c,accuracy:c.total?c.correct/c.total:0})).sort((c,l)=>c.accuracy-l.accuracy);return{total:e.length,accuracy:i,streakDays:s,topics:a}}const $e="You are a concise SSC exam tutor. Answer in under 120 words. Match the question's language (Hindi or English). Be factual, no filler.";function jt(e,t){const i=e.options.map((s,o)=>`${String.fromCharCode(65+o)}) ${s}`).join(`
`),n=t==null?"(unattempted)":String.fromCharCode(65+t);return`Q: ${e.stem}
${i}
Correct: ${String.fromCharCode(65+e.answer)} | Chosen: ${n}
Explain WHY the correct answer is right and the key distractor is wrong. Topic: ${e.topic}.`}function Pt(e,t){return`Earlier Q (correct ${String.fromCharCode(65+e.answer)}): ${e.stem}
Doubt: ${t}
Clarify briefly.`}function Ct({subject:e,topic:t,label:i,labelHi:n,skill:s,difficulty:o,count:r=1}){return`Generate ${r} SSC JHT Paper 1 MCQ question(s) for subject ${e==="hi"?"Hindi":e==="en"?"English":"mixed"}.
Topic: ${i} (${n||i}).
Skill: ${s||"general"}.
Difficulty: ${o||3}/5.
Return ONLY valid JSON array. Each item must have:
id, topic, skill, difficulty, lang, source, stem, options, answer, explain, tags.
Constraints:
- Exactly 4 options per question.
- answer is 0-3.
- Keep explanations short and exam-oriented.
- Make distractors plausible and aligned to SSC JHT patterns.
- Use PYQ-style traps where appropriate.
- If subject is Hindi, write stem/options/explain in Hindi.
- If subject is English, write them in English.
- source must be "AI-GENERATED".
- tags should be an array of 2-4 short strings.
- No markdown, no code fences, no extra commentary.`}const Mt="@cf/meta/llama-3-8b-instruct";function it(){return"neurons-"+new Date().toISOString().slice(0,10)}async function pe(){return await m(it(),0)||0}async function st(e){const t=await pe();return await y(it(),t+e),t+e}function nt(e,t){const i=Math.ceil(e.length/4),n=Math.ceil(t.length/4);return Math.ceil((i+n)/2)}async function me(){const[e,t,i]=await Promise.all([m("cf_account",""),m("cf_token",""),m("cf_model",Mt)]);return!e||!t?null:{accountId:e,token:t,model:i}}async function Ie(e,t){var r;const i=await me(),n=`https://api.cloudflare.com/client/v4/accounts/${i.accountId}/ai/run/${t}`,s=await fetch(n,{method:"POST",headers:{Authorization:`Bearer ${i.token}`,"Content-Type":"application/json"},body:JSON.stringify({messages:e,max_tokens:220,temperature:.3})});if(!s.ok){const a=await s.text().catch(()=>"");throw new Error(`CF ${s.status}: ${a.slice(0,200)}`)}const o=await s.json();return((r=o==null?void 0:o.result)==null?void 0:r.response)||""}async function Oe(e,t){const i=e.explain||null,n=await me();if(!n)return{text:i||"(Enable AI in Settings for explanations.)",source:"static"};const s=`expl:${e.id}:${t??"na"}`,o=await Ae(s);if(o)return{text:o,source:"cache"};const r=await m("neuron_cap",8e3)||8e3;if(await pe()>=r)return{text:i||"Daily AI limit reached. Static explanation shown.",source:"static"};try{const a=jt(e,t),l=(await Ie([{role:"system",content:$e},{role:"user",content:a}],n.model)||"").trim()||i;return await Se(s,l),await st(nt(a,l)),{text:l,source:"ai"}}catch(a){return{text:i||"AI error: "+a.message,source:"static"}}}async function Ut(e,t){const i=await me();if(!i)return{text:"Enable AI in Settings.",source:"static"};const n=await m("neuron_cap",8e3)||8e3;if(await pe()>=n)return{text:"Daily limit reached.",source:"static"};try{const s=Pt(e,t),o=await Ie([{role:"system",content:$e},{role:"user",content:s}],i.model);return await st(nt(s,o||"")),{text:(o||"").trim(),source:"ai"}}catch(s){return{text:"AI error: "+s.message,source:"static"}}}async function Re(){const e=await m("neuron_cap",8e3)||8e3;return{used:await pe(),cap:e}}function Lt(e){return`gen:${e.subject||"any"}:${e.topic||"any"}:${e.skill||"any"}:${e.difficulty||"any"}`}function Bt(e){const t=String(e||"").trim(),i=t.indexOf("["),n=t.lastIndexOf("]"),s=i>=0&&n>=i?t.slice(i,n+1):t;try{return JSON.parse(s)}catch{return null}}function Nt(e,t,i=0){const n=e.topic||t.topic,s=Number(e.difficulty||t.difficulty||3),o=Number(e.answer);return{id:e.id||`${t.topic||"gen"}-${Date.now().toString(36)}-${i}`,topic:n,skill:e.skill||t.skill||null,difficulty:s,lang:e.lang||t.subject||"en",source:e.source||"AI-GENERATED",stem:e.stem||"",options:Array.isArray(e.options)?e.options.slice(0,4):[],answer:Number.isInteger(o)&&o>=0&&o<=3?o:0,explain:e.explain||"",tags:Array.isArray(e.tags)?e.tags:[],generated:!0}}async function qt(e,t,i){const n=await Ae(i);if(n)return n;const s=await Ie(e,t);return await Se(i,s),s}async function oe(e,t=1){const i=await me();if(!i)return{questions:[],source:"static"};const n=Lt(e),s=Ct({...e,count:t});try{const o=await qt([{role:"system",content:$e},{role:"user",content:s}],i.model,`${n}:${t}`),r=Bt(o);if(!Array.isArray(r))return{questions:[],source:"static"};const a=r.map((c,l)=>Nt(c,e,l)).filter(c=>c.stem&&c.options.length===4);for(const c of a)await Te(c);return{questions:a,source:"ai"}}catch{return{questions:[],source:"static"}}}async function fe(){return le()}const Ft=Object.freeze(Object.defineProperty({__proto__:null,explain:Oe,followup:Ut,generateQuestions:oe,getGeneratedBank:fe,getUsage:Re},Symbol.toStringTag,{value:"Module"}));async function Vt(e,t,{topbar:i,go:n}){e.innerHTML=`${i("SSC JHT","Paper 1 practice")}
    <div id="home-body"><div class="ui-spinner"></div></div>`;const s=await tt(),o=await Re(),r=s.total?Math.round(s.accuracy*100):0,a=s.topics.slice(0,4);document.getElementById("home-body").innerHTML=`
    <div class="ui-card ui-gap-bottom">
      <div class="ui-card__header">
        <h2 class="ui-section-head__title">Welcome back</h2>
      </div>
      <div class="ui-card__body">
        <div class="ui-stat-row ui-mb-lg">
          <div class="ui-stat">
            <div class="ui-stat__value">${s.total}</div>
            <div class="ui-stat__label">Answered</div>
          </div>
          <div class="ui-stat">
            <div class="ui-stat__value">${r}%</div>
            <div class="ui-stat__label">Accuracy</div>
            <div class="ui-stat__sub">Overall correctness</div>
          </div>
          <div class="ui-stat">
            <div class="ui-stat__value">${s.streakDays}</div>
            <div class="ui-stat__label">Streak</div>
            <div class="ui-stat__sub">Active days</div>
          </div>
          <div class="ui-stat">
            <div class="ui-stat__value">${o.used}/${o.cap}</div>
            <div class="ui-stat__label">AI today</div>
            <div class="ui-stat__sub">Neurons used</div>
          </div>
        </div>
        <div class="ui-ring-row">
          <div class="ui-ring ui-ring--glow" style="--p: ${Math.min(100,o.used/o.cap*100)};">
            <div class="ui-ring__inner">${Math.round(o.used/o.cap*100)}%</div>
          </div>
          <div>
            <p class="ui-muted">Weakest topics appear at top in Progress. The adaptive engine drills those first.</p>
            <div class="ui-btn-row ui-mt-md">
              <span class="ui-badge ui-badge--good">Offline-first</span>
              <span class="ui-badge ui-badge--neutral">Adaptive</span>
              <span class="ui-badge ui-badge--neutral">Paper 1</span>
            </div>
          </div>
        </div>
      </div>
    </div>

        <div class="ui-row ui-mb-md" style="display: flex; gap: 12px; flex-wrap: wrap;">
      <div class="ui-card" style="flex: 1; min-width: 140px;">
        <div class="ui-stat">
          <div class="ui-stat__value" id="today-count">-</div>
          <div class="ui-stat__label">Today</div>
          <div class="ui-stat__sub">of goal</div>
        </div>
      </div>
      <div class="ui-card" style="flex: 1; min-width: 140px;">
        <div class="ui-stat">
          <div class="ui-stat__value" id="due-count">-</div>
          <div class="ui-stat__label">Due</div>
          <div class="ui-stat__sub">for review</div>
        </div>
      </div>
      <div class="ui-card" style="flex: 1; min-width: 140px;">
        <div class="ui-stat">
          <div class="ui-stat__value" id="bm-count">-</div>
          <div class="ui-stat__label">Bookmarked</div>
          <div class="ui-stat__sub">questions</div>
        </div>
      </div>
    </div>

    <div class="ui-section-head">
      <h2 class="ui-section-head__title">Choose a mode</h2>
      <span class="ui-muted">Start in the format that matches your study goal</span>
    </div>
    <div class="grid">
      <div class="ui-card ui-card--interactive ui-card--glow mode-card" data-mode="mock">
        <span class="emoji">📝</span>
        <strong>Full Mock Test</strong>
        <span class="desc">200 Q, 2 hours, negative marking.</span>
      </div>
      <div class="ui-card ui-card--interactive ui-card--glow mode-card" data-mode="quick">
              <div class="ui-card ui-card--interactive ui-card--glow mode-card" data-mode="bookmarked">
        <span class="emoji">📌</span>
        <strong>Bookmarked</strong>
        <span class="desc">Review questions you have bookmarked.</span>
      </div>
      <div class="ui-card ui-card--interactive ui-card--glow mode-card" data-mode="mistakes">
        <span class="emoji"></span>
        <strong>Review Mistakes</strong>
        <span class="desc">Re-attempt questions you got wrong before.</span>
      </div>
    </div>

    <div class="ui-card ui-gap-top">
      <div class="ui-card__header">
        <h2 class="ui-section-head__title">Weakest topics to focus</h2>
      </div>
      <div class="ui-card__body">
        ${a.length?`
          <div class="ui-list">
            ${a.map(c=>`
              <div class="ui-list-item">
                <span>${c.topic.replace(/_/g," ")}</span>
                <span class="ui-muted">${Math.round(c.accuracy*100)}% · ${c.correct}/${c.total}</span>
              </div>
            `).join("")}
          </div>
        `:`
          <div class="ui-empty">
            <p class="ui-muted">No data yet — take a quiz!</p>
          </div>
        `}
      </div>
    </div>`,(async()=>{const c=await m("daily_goal",30),l=await j(),f=new Date().toDateString(),p=l.filter(function(d){return new Date(d.ts).toDateString()===f}).length;document.getElementById("today-count").textContent=p+"/"+c;const h=l.filter(function(d){return!d.correct}).length;document.getElementById("due-count").textContent=h>0?h:"0";const u=await m("bookmarks",[]);document.getElementById("bm-count").textContent=u.length})(),e.querySelectorAll("[data-mode]").forEach(c=>{c.addEventListener("click",()=>{const l=c.getAttribute("data-mode");n("quiz",{mode:l})})})}const zt="modulepreload",Gt=function(e){return"/ssc-jht-quizz/"+e},Pe={},ke=function(t,i,n){let s=Promise.resolve();if(i&&i.length>0){document.getElementsByTagName("link");const r=document.querySelector("meta[property=csp-nonce]"),a=(r==null?void 0:r.nonce)||(r==null?void 0:r.getAttribute("nonce"));s=Promise.allSettled(i.map(c=>{if(c=Gt(c),c in Pe)return;Pe[c]=!0;const l=c.endsWith(".css"),f=l?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${c}"]${f}`))return;const p=document.createElement("link");if(p.rel=l?"stylesheet":zt,l||(p.as="script"),p.crossOrigin="",p.href=c,a&&p.setAttribute("nonce",a),document.head.appendChild(p),l)return new Promise((h,u)=>{p.addEventListener("load",h),p.addEventListener("error",()=>u(new Error(`Unable to preload CSS for ${c}`)))})}))}function o(r){const a=new Event("vite:preloadError",{cancelable:!0});if(a.payload=r,window.dispatchEvent(a),!a.defaultPrevented)throw r}return s.then(r=>{for(const a of r||[])a.status==="rejected"&&o(a.reason);return t().catch(o)})},te={hi:{label:"General Hindi",labelHi:"सामान्य हिन्दी"},en:{label:"General English",labelHi:"सामान्य अंग्रेज़ी"}},q=[{id:"hi_comprehension",subject:"hi",share:20,label:"गद्यांश बोध / Comprehension",labelHi:"गद्यांश बोध",skills:["inference","tone","detail","contrary"]},{id:"hi_synonym",subject:"hi",share:12,label:"पर्यायवाची शब्द",labelHi:"पर्यायवाची",skills:["common","classical","rarest","all_real"]},{id:"hi_sentence_type",subject:"hi",share:12,label:"वाक्य रचना (सरल/संयुक्त/मिश्र/शुद्धि)",labelHi:"वाक्य रचना",skills:["classify","identify","not_x","gender"]},{id:"hi_terminology",subject:"hi",share:11,label:"प्रशासनिक / पारिभाषिक शब्दावली",labelHi:"प्रशासनिक शब्द",skills:["hi_to_en","en_to_hi","context","register"]},{id:"hi_pada_parichay",subject:"hi",share:8,label:"पद परिचय (क्रिया/कारक/विशेषण)",labelHi:"पद परिचय",skills:["verb_type","karak","adjective","adverb","dual"]},{id:"hi_punctuation",subject:"hi",share:7,label:"विराम चिन्ह",labelHi:"विराम चिन्ह",skills:["name","usage","double"]},{id:"hi_bias_free",subject:"hi",share:5,label:"पूर्वाग्रह-मुक्त अभिव्यक्ति",labelHi:"पूर्वाग्रह-मुक्त भाषा",skills:["rewrite","identify","content_preserve"]},{id:"hi_antonym",subject:"hi",share:5,label:"विलोम शब्द",labelHi:"विलोम",skills:["common","rare","synonym_trap"]},{id:"hi_spelling",subject:"hi",share:4,label:"शुद्ध वर्तनी",labelHi:"वर्तनी",skills:["identify","insentence"]},{id:"hi_economic",subject:"hi",share:4,label:"आर्थिक शब्दावली",labelHi:"आर्थिक शब्द",skills:["definition","context"]},{id:"hi_localization",subject:"hi",share:3,label:"स्थानीयकरण / Localization",labelHi:"स्थानीयकरण",skills:["violate","unnatural","naturalized"]},{id:"hi_multimeaning",subject:"hi",share:3,label:"सूक्ष्म अर्थ (बहुअर्थी शब्द)",labelHi:"सूक्ष्म अर्थ",skills:["subtle","rarest","not_meaning"]},{id:"hi_meaning",subject:"hi",share:2,label:"अर्थ / व्याख्या",labelHi:"अर्थ",skills:["identify"]},{id:"hi_idiom",subject:"hi",share:1,label:"मुहावरे",labelHi:"मुहावरे",skills:["meaning"]},{id:"hi_jati_bhav",subject:"hi",share:1,label:"जातिवाचक → भाववाचक संज्ञा",labelHi:"जातिवाचक/भाववाचक",skills:["identify","not_x"]},{id:"hi_figure",subject:"hi",share:1,label:"व्यंग्यार्थ",labelHi:"व्यंग्यार्थ",skills:["identify","not_x"]},{id:"en_reading",subject:"en",share:15,label:"Reading Comprehension",labelHi:"गद्यांश",skills:["inference","detail","grammar_in_context","tone","title"]},{id:"en_cloze",subject:"en",share:15,label:"Cloze Test (passage fill-in)",labelHi:"रिक्त स्थान (गद्यांश)",skills:["tense","verb_form","vocab","phrase"]},{id:"en_pqrs",subject:"en",share:12,label:"Sentence Arrangement (PQRS)",labelHi:"वाक्य क्रम",skills:["chronological","biographical","argument","causal","process"]},{id:"en_narration",subject:"en",share:6,label:"Narration (Direct/Indirect)",labelHi:"विधि (Direct/Indirect)",skills:["indirect_to_direct","direct_to_indirect","exclamatory","question"]},{id:"en_voice",subject:"en",share:6,label:"Voice (Active/Passive)",labelHi:"वाच्य (Active/Passive)",skills:["simple","continuous","perfect","modal","infinitive","stacked"]},{id:"en_oneword",subject:"en",share:5,label:"One-word Substitution",labelHi:"एक-शब्द प्रयोग",skills:["age","medical","person","legal"]},{id:"en_spelling",subject:"en",share:5,label:"Spelling",labelHi:"वर्तनी",skills:["identify_correct","identify_wrong","fill_blank"]},{id:"en_antonym",subject:"en",share:5,label:"Antonyms",labelHi:"विलोम",skills:["common","advanced","synonym_trap"]},{id:"en_synonym",subject:"en",share:5,label:"Synonyms",labelHi:"समानार्थी",skills:["common","advanced","antonym_trap"]},{id:"en_homonym",subject:"en",share:5,label:"Homonyms / Homophones",labelHi:"समनाम",skills:["not_meaning","homophone"]},{id:"en_idiom",subject:"en",share:5,label:"Idioms & Phrases",labelHi:"मुहावरे",skills:["meaning"]},{id:"en_error",subject:"en",share:5,label:"Common Errors / Spotting",labelHi:"अशुद्धि पहचान",skills:["superlative","double_comp","degree","agreement"]},{id:"en_improvement",subject:"en",share:5,label:"Sentence Improvement (tense)",labelHi:"वाक्य सुधार",skills:["past_continuous","future_perfect","past_perfect"]},{id:"en_article",subject:"en",share:4,label:"Articles",labelHi:"Articles",skills:["definite","indefinite","zero","double_blank"]},{id:"en_grammar",subject:"en",share:4,label:"Grammar in Context",labelHi:"व्याकरण",skills:["sentence_type","participle","gerund"]}],Ce=e=>q.find(t=>t.id===e),Qt=e=>q.filter(t=>t.subject===e),ie="विज्ञान और तकनीक ने मानव जीवन को अभूतपूर्व गति और सुविधा प्रदान की है। वह कार्य जो पहले घंटों में होते थे, अब मिनटों में पूरे हो जाते हैं। डिजिटल उपकरण, रोबोट, कृत्रिम बुद्धिमत्ता (AI) और मशीन लर्निंग जैसे नवाचारों ने हमारे जीवन को सरल तो बनाया है, लेकिन एक महत्वपूर्ण प्रश्न भी उठाया है — क्या इस तकनीकी प्रगति की चमक में हम अपनी संवेदनाओं की ऊष्मा को तो नहीं खो रहे? आज निर्णय लेने की प्रक्रिया तेजी से मानवीय विवेक से हटकर एल्गोरिदम और डेटा के आधार पर होने लगी है। कृत्रिम बुद्धिमत्ता उन क्षेत्रों में प्रवेश कर रही है जहाँ पहले केवल मानवीय अनुभव, भावना और अंतःप्रज्ञा की आवश्यकता होती थी — जैसे चिकित्सा निर्णय, न्याय व्यवस्था, या मानसिक परामर्श। ऐसे में प्रश्न यह उठता है कि क्या ये यंत्र उस भावनात्मक गहराई, सहानुभूति और नैतिकता को समझ सकते हैं जो एक मनुष्य की आत्मा का मूल गुण है? हम यंत्रों से गति ले सकते हैं, पर दिशा अपने अंतःकरण से ही चुननी होगी।",J=[{id:"h001",topic:"hi_comprehension",skill:"inference",difficulty:4,lang:"hi",source:"AUTHORED",passage:ie,stem:"इस गद्यांश के अनुसार तकनीकी प्रगति का सबसे बड़ा खतरा क्या है?",options:["मनुष्य की रचनात्मकता में वृद्धि","मानवीय संवेदनाओं का क्षय","तकनीकी गति में कमी","डेटा संग्रहण की समस्या"],answer:1,explain:'अनुमान-प्रश्न है। गद्यांश कहता है "क्या हम संवेदनाओं की ऊष्मा को तो नहीं खो रहे" — अर्थात संवेदनाओं का क्षय ही सबसे बड़ा खतरा है।'},{id:"h002",topic:"hi_comprehension",skill:"inference",difficulty:5,lang:"hi",source:"AUTHORED",passage:ie,stem:'"यंत्रों से गति लें, पर दिशा अंतःकरण से चुनें" — इस वाक्य का अभिप्राय है:',options:["यंत्रों को नियंत्रित करना असंभव है","तकनीक से ही दिशा तय होती है","तकनीक सहायक है, पर निर्णय मानवीय विवेक से होने चाहिए","अंतःकरण अप्रासंगिक हो गया है"],answer:2,explain:"रूपक अर्थ वाला सबसे कठिन RC प्रकार। सभी विकल्प कथन के एक अंश को लेते हैं; सही उत्तर द्वैत को पकड़ता है — तकनीक से गति, अंतःकरण से दिशा।"},{id:"h003",topic:"hi_comprehension",skill:"detail",difficulty:2,lang:"hi",source:"AUTHORED",passage:ie,stem:"लेखक के अनुसार कृत्रिम बुद्धिमत्ता (AI) का कौन-सा क्षेत्र अत्यंत संवेदनशील है?",options:["ऑनलाइन खरीदारी","स्वचालित वाहन","मानसिक परामर्श","संगीत रचना"],answer:2,explain:'गद्यांश में सीधे कहा गया: "चिकित्सा निर्णय, न्याय व्यवस्था, या मानसिक परामर्श"। विवरण-प्रश्न है।'},{id:"h004",topic:"hi_comprehension",skill:"tone",difficulty:3,lang:"hi",source:"AUTHORED",passage:ie,stem:"लेखक का तकनीक के प्रति दृष्टिकोण कैसा है?",options:["पूर्णतः विरोधात्मक","केवल प्रशंसात्मक","संतुलनवादी और विवेकपूर्ण","अनावश्यक आशंका से ग्रस्त"],answer:2,explain:"लेखक तकनीक का उपयोग करता है (तो पूर्ण विरोधी नहीं), पर चेतावनी भी देता है (तो केवल प्रशंसक नहीं)। नूह-पहचान चाहिए।"},{id:"h010",topic:"hi_synonym",skill:"rarest",difficulty:5,lang:"hi",source:"AUTHORED",stem:"'चंद्रमा' के लिए निम्न में से सबसे दुर्लभ पर्यायवाची क्या है?",options:["सोमराज","सहस्रांशु","निशापति","इन्दु"],answer:1,explain:'सभी चार वास्तविक पर्यायवाची हैं। सहस्रांशु = "हजार किरणों वाला", वैदिक साहित्य में, सबसे दुर्लभ। यह सबसे कठिन पर्यायवाची प्रारूप है।'},{id:"h011",topic:"hi_synonym",skill:"classical",difficulty:4,lang:"hi",source:"AUTHORED",stem:"'आकाश' के लिए निम्न में से शास्त्रीय (वैदिक/संस्कृत) पर्यायवाची कौन-सा है?",options:["अन्तरिक्ष","व्योम","नभ","गगन"],answer:1,explain:"अन्तरिक्ष = बाहरी अंतरिक्ष (भिन्न अवधारणा), नभ/गगन = सामान्य काव्य। व्योम = विशेष रूप से वैदिक/शास्त्रीय साहित्य।"},{id:"h012",topic:"hi_synonym",skill:"classical",difficulty:5,lang:"hi",source:"AUTHORED",stem:"'मन' के लिए निम्न में से सबसे उपयुक्त दार्शनिक पर्यायवाची क्या है?",options:["अन्तःकरण","आत्मा","बुद्धि","चेतना"],answer:0,explain:'जाल: आत्मा — सबसे प्रसिद्ध दार्शनिक शब्द, पर गलत। वेदांत में अन्तःकरण = आंतरिक सत्व (मन+बुद्धि+चित्त+अहंकार) = "मन" का सबसे सटीक प्रतिनिधि।'},{id:"h013",topic:"hi_synonym",skill:"common",difficulty:2,lang:"hi",source:"AUTHORED",stem:"'विहग' का समानार्थी शब्द क्या है?",options:["पक्षी","कीड़ा","पशु","मछली"],answer:0,explain:"विहग = पक्षी (bird)।"},{id:"h014",topic:"hi_synonym",skill:"classical",difficulty:4,lang:"hi",source:"AUTHORED",stem:"'वायु' के लिए दार्शनिक/वैदिक पर्यायवाची शब्द क्या है?",options:["मारुत","अनिल","समीर","वात"],answer:0,explain:"जाल: समीर (उर्दू-प्रभावित काव्य)। मारुत = विशेष रूप से वैदिक वायु देवता, उपनिषद्/दार्शनिक संदर्भ में प्रयुक्त।"},{id:"h015",topic:"hi_synonym",skill:"all_real",difficulty:3,lang:"hi",source:"AUTHORED",stem:"'अंधकार' का समानार्थी शब्द है:",options:["उजाला","तम","प्रभा","प्रकाश"],answer:1,explain:"उजाला, प्रभा, प्रकाश = विलोम। तम = अंधकार का पर्यायवाची।"},{id:"h020",topic:"hi_antonym",skill:"synonym_trap",difficulty:4,lang:"hi",source:"AUTHORED",stem:"'आश्रित' का उपयुक्त विलोम क्या होगा?",options:["निर्भर","सेवक","संपन्न","स्वतंत्र"],answer:3,explain:"जाल: निर्भर = आश्रित का SYNONYM (दोनों अर्थ dependent), विलोम नहीं। स्वतंत्र = independent = सही विलोम।"},{id:"h021",topic:"hi_antonym",skill:"rare",difficulty:4,lang:"hi",source:"AUTHORED",stem:"'गूढ़' (सूक्ष्म/गहरा) का विलोम क्या है?",options:["स्पष्ट","सरल","प्रकट","रहस्यमय"],answer:1,explain:"जाल: स्पष्ट (आंशिक रूप से काम करता है पर कम सटीक); रहस्यमय = synonym। गूढ़ = गहरा/जटिल का सही विपरीत = सरल (simple)।"},{id:"h022",topic:"hi_antonym",skill:"common",difficulty:2,lang:"hi",source:"AUTHORED",stem:"'विग्रह' का विलोम है:",options:["कलह","विवाद","संधि","युद्ध"],answer:2,explain:"कलह, विवाद, युद्ध = विग्रह के पर्यायवाची। संधि = मिलन/शांति = विपरीत।"},{id:"h030",topic:"hi_sentence_type",skill:"classify",difficulty:2,lang:"hi",source:"AUTHORED",stem:"निम्नलिखित में से सरल वाक्य पहचानिए:",options:["सुबह का सूरज आकाश में तेजी से चमक रहा है","मैं खाना खाता हूँ और टीवी देखता हूँ","वह दौड़ा क्योंकि ट्रेन छूट रही थी","जब मैं आया, तब तुम सो रहे थे"],answer:0,explain:'केवल एक उपवाक्य = सरल। "और" = संयुक्त, "क्योंकि" = मिश्र, "जब...तब" = मिश्र।'},{id:"h031",topic:"hi_sentence_type",skill:"identify",difficulty:3,lang:"hi",source:"AUTHORED",stem:"संयुक्त वाक्य की पहचान कीजिए:",options:["वह आया, पर उसने कुछ नहीं कहा","मैं बाजार गया","सूरज निकल रहा है","अगर वह आएगा, तो हम मिलेंगे"],answer:0,explain:'"पर" = समन्वयक योजक (coordinating conjunction) = संयुक्त वाक्य। बाकी सरल या मिश्र हैं।'},{id:"h032",topic:"hi_sentence_type",skill:"classify",difficulty:3,lang:"hi",source:"AUTHORED",stem:"मिश्र वाक्य का उदाहरण चुनिए:",options:["अगर वह आएगा, तो हम मिलेंगे","बच्चे खेलते हैं","सूरज चमक रहा है","वह पढ़ रहा है"],answer:0,explain:'"अगर...तो" = अधीनस्थ योजक (subordinating) = मिश्र वाक्य।'},{id:"h033",topic:"hi_sentence_type",skill:"not_x",difficulty:3,lang:"hi",source:"AUTHORED",stem:"निम्न में से कौन-सा वाक्य संयुक्त वाक्य नहीं है?",options:["सूरज डूब रहा है और चाँद निकल रहा है","बच्चे स्कूल जाते हैं","मैं पढ़ता हूँ और वह खेलता है","वह आया लेकिन कुछ नहीं कहा"],answer:1,explain:'"बच्चे स्कूल जाते हैं" = सरल वाक्य (एक उपवाक्य), संयुक्त नहीं।'},{id:"h034",topic:"hi_sentence_type",skill:"gender",difficulty:3,lang:"hi",source:"AUTHORED",stem:"निम्न में से कौन-सा एक वाक्य शुद्ध है?",options:["मैं कानपुर गया था","मेरा पुस्तक खो गया","लता दो चिट्ठी लिखी","यह तो मेरा पुस्तक है"],answer:0,explain:'"पुस्तक" = स्त्रीलिंग → "मेरी पुस्तक"। "दो चिट्ठी" → "दो चिट्ठियाँ"। केवल "मैं कानपुर गया था" शुद्ध।'},{id:"h040",topic:"hi_terminology",skill:"hi_to_en",difficulty:3,lang:"hi",source:"AUTHORED",stem:'प्रशासनिक शब्द "समायोजन" के लिए उपयुक्त अंग्रेजी शब्द क्या होगा?',options:["Agreement","Adjustment","Adjournment","Agenda"],answer:1,explain:"जाल: Agreement = समझौता (≠ समायोजन)। समायोजन = Adjustment। यह भ्रम अत्यंत सामान्य है।"},{id:"h041",topic:"hi_terminology",skill:"hi_to_en",difficulty:4,lang:"hi",source:"AUTHORED",stem:'पारिभाषिक शब्द "स्वीकृति" के लिए उपयुक्त अंग्रेजी शब्द क्या होगा?',options:["Adjourn","Agrarian","Agenda","Acknowledgement"],answer:3,explain:'सभी चार विकल्प "A" से शुरू — जानबूझकर भ्रम पैदा करते हैं। Adjourn=स्थगन, Agrarian=कृषि-संबंधी, Agenda=कार्यसूची।'},{id:"h042",topic:"hi_terminology",skill:"hi_to_en",difficulty:3,lang:"hi",source:"AUTHORED",stem:"प्रशासनिक शब्द 'प्रतिनियुक्ति' के लिए उपयुक्त अंग्रेजी शब्द क्या होगा?",options:["Implementation","Provision","Deputation","Declaration"],answer:2,explain:"प्रतिनियुक्ति = Deputation। Implementation=कार्यान्वयन, Provision=प्रावधान।"},{id:"h043",topic:"hi_terminology",skill:"en_to_hi",difficulty:3,lang:"hi",source:"AUTHORED",stem:"पारिभाषिक शब्द 'Cadre' का उपयुक्त हिंदी अर्थ क्या है?",options:["एकमत","संवर्ग","सभा","पूँजी"],answer:1,explain:"Cadre = संवर्ग। एकमत=unanimous, सभा=assembly, पूँजी=capital।"},{id:"h044",topic:"hi_terminology",skill:"en_to_hi",difficulty:3,lang:"hi",source:"AUTHORED",stem:"'Per mensem' अभिव्यक्ति के लिए हिंदी में उपयुक्त शब्द क्या होगा?",options:["प्रतिदिन","प्रतिशत","प्रतिमास","प्रतिमान"],answer:2,explain:'जाल: प्रतिमान = मानक/standard, ध्वन्यात्मक रूप से "mensem" जैसा पर गलत। mensem = लैटिन में "माह" → प्रतिमास।'},{id:"h045",topic:"hi_terminology",skill:"register",difficulty:4,lang:"hi",source:"AUTHORED",stem:'"तदनुसार कार्यवाही की जाए" — यह वाक्यांश किस प्रकार का निर्देश है?',options:["टालने योग्य","कालान्तरित","परामर्शात्मक","बाध्यकारी कार्यान्वयन"],answer:3,explain:'जाल: परामर्शात्मक (advisory)। सरकारी भाषा में "तदनुसार कार्यवाही की जाए" = अनिवार्य/बाध्यकारी, सलाह नहीं।'},{id:"h050",topic:"hi_pada_parichay",skill:"dual",difficulty:5,lang:"hi",source:"AUTHORED",stem:'"दादी जी रोज सुबह मंदिर जाती हैं" — क्रिया का प्रकार और क्रिया विशेषण का प्रकार पहचानें।',options:["अकर्मक क्रिया, स्थानवाचक क्रिया विशेषण","सकर्मक क्रिया, स्थानवाचक क्रिया विशेषण","अकर्मक क्रिया, कालवाचक क्रिया विशेषण","सकर्मक क्रिया, कालवाचक क्रिया विशेषण"],answer:2,explain:'जाल: "मंदिर" दिखता है कर्म पर वास्तव में दिशा/गंतव्य है → कर्म नहीं। जाना = अकर्मक; "रोज सुबह" = कालवाचक (समय)। द्वैत-उत्तर प्रारूप = सबसे कठिन।'},{id:"h051",topic:"hi_pada_parichay",skill:"verb_type",difficulty:3,lang:"hi",source:"AUTHORED",stem:'"सूर्य उदय होता है" — इस वाक्य में "उदय होता है" क्रिया का प्रकार बताइए।',options:["द्विकर्मक क्रिया","प्रेरणार्थक क्रिया","सकर्मक क्रिया","अकर्मक क्रिया"],answer:3,explain:"कर्म नहीं है → अकर्मक क्रिया।"},{id:"h052",topic:"hi_pada_parichay",skill:"karak",difficulty:3,lang:"hi",source:"AUTHORED",stem:'"माँ ने बच्चे को कहानी सुनाई" — इसमें "बच्चे को" कौन-सा कारक है?',options:["कर्ता","अपादान","कर्म","संबोधन"],answer:2,explain:"बच्चे को = कहानी सुनाई का कर्म (object)।"},{id:"h053",topic:"hi_pada_parichay",skill:"adverb",difficulty:2,lang:"hi",source:"AUTHORED",stem:'"वह धीरे-धीरे चलता है" — "धीरे-धीरे" कौन-सा क्रिया विशेषण है?',options:["स्थानवाचक","रीतिवाचक","कालवाचक","परिमाणवाचक"],answer:1,explain:"रीतिवाचक = बताता है कैसे (HOW)। धीरे-धीरे = चलने की रीति।"},{id:"h060",topic:"hi_punctuation",skill:"name",difficulty:3,lang:"hi",source:"AUTHORED",stem:"अपूर्णविराम का एक अन्य नाम क्या है?",options:["अर्द्धविराम","अल्पविराम","उपविराम","पूर्णविराम"],answer:2,explain:"अपूर्णविराम (colon :) = उपविराम। अल्पविराम = comma (,), अर्द्धविराम = semicolon (;), पूर्णविराम = full stop (।)। नामकरण प्रारूप ≠ उपयोग प्रारूप।"},{id:"h061",topic:"hi_punctuation",skill:"usage",difficulty:2,lang:"hi",source:"AUTHORED",stem:'"तुम कैसे हो__" — रिक्त स्थान में उपयुक्त विराम चिन्ह है:',options:["। (पूर्णविराम)","? (प्रश्नवाचक)","! (विस्मयादिबोधक)",", (अल्पविराम)"],answer:1,explain:"प्रश्न है → प्रश्नवाचक चिह्न (?)।"},{id:"h062",topic:"hi_punctuation",skill:"double",difficulty:3,lang:"hi",source:"AUTHORED",stem:'"वाह! क्या सुंदर दृश्य है__" — वाक्य के अंत में उपयुक्त विराम चिन्ह है:',options:["। (पूर्णविराम)","! (विस्मयादिबोधक)",". (पूर्णविराम)","? (प्रश्नवाचक)"],answer:1,explain:"विस्मयसूचक भाव अंत तक बना रहता है → अंत में भी !। । भाव को नहीं रखता।"},{id:"h063",topic:"hi_punctuation",skill:"usage",difficulty:4,lang:"hi",source:"AUTHORED",stem:"जब किसी पद की व्याख्या करनी हो, तब किस चिन्ह का प्रयोग होता है?",options:["योजक चिन्ह","विवरण चिन्ह (:)","निर्देशन चिन्ह","उद्धरण चिह्न"],answer:1,explain:"विवरण-चिह्न (colon) = व्याख्या या सूची प्रस्तुत करता है। उद्धरण चिह्न = अन्य उद्देश्य।"},{id:"h070",topic:"hi_bias_free",skill:"rewrite",difficulty:4,lang:"hi",source:"AUTHORED",stem:'"उनकी भाषा बहुत पिछड़ी हुई है" — इसका पूर्वाग्रह-मुक्त विकल्प चुनिए।',options:["उनकी भाषा तो गड़बड़ है","उनकी भाषा की संरचना अलग है, समझने की आवश्यकता है","वो तो अनपढ़ों की भाषा है","गाँव वाले ऐसी ही बोलते हैं"],answer:1,explain:"नियम: मूल्य-निर्णय (पिछड़ी=backward) हटाओ, वर्णनात्मक भाषा (संरचना अलग) रखो।"},{id:"h071",topic:"hi_bias_free",skill:"content_preserve",difficulty:5,lang:"hi",source:"AUTHORED",stem:'"हमने नौकरों को निर्देश दिए" — इसका पूर्वाग्रह-मुक्त विकल्प क्या हो सकता है?',options:["हमने घरेलू सहायकों को निर्देश दिए","हमने सेवकों को आदेश दिए","हमने कार्यकर्ताओं को तैनात किया","हमने मजदूरों को समझाया"],answer:0,explain:'नियम: केवल रजिस्टर/लेबल बदलो, क्रिया नहीं। "तैनात" ≠ "निर्देश", "समझाया" ≠ "निर्देश"। केवल पहला विकल्प क्रिया सुरक्षित रखता है।'},{id:"h072",topic:"hi_bias_free",skill:"rewrite",difficulty:3,lang:"hi",source:"AUTHORED",stem:'"पुस्तक गूँगे-बहरे के लिए नहीं थी" — इसे पूर्वग्रह-मुक्त कैसे बनाया जाए?',options:["पुस्तक विशेष योग्यताओं के अनुसार बनाई गई थी","पुस्तक सभी के लिए सुलभ नहीं थी","वह किताब कुछ खास लोगों के लिए थी","यह किताब केवल सुनने वालों के लिए थी"],answer:1,explain:"सुलभता-ढांचा (accessibility framing) अपमानजनक लेबल हटाता है।"},{id:"h080",topic:"hi_spelling",skill:"identify",difficulty:3,lang:"hi",source:"AUTHORED",stem:"निम्न में से कौन-सा एक शब्द शुद्ध है?",options:["प्राय","निश्काम","निष्काम","अस्क"],answer:2,explain:"निष्काम (विसर्ग का ष हो जाता है क से पहले)। प्राय → प्रायः।"},{id:"h081",topic:"hi_spelling",skill:"insentence",difficulty:4,lang:"hi",source:"AUTHORED",stem:"किस वाक्य में शुद्ध वर्तनी वाले शब्द का प्रयोग हुआ है?",options:["मौर्य सामराज्य का विस्तार बहुत बड़ा था","प्रसिद्ध कवित्री ने अपनी नवीनतम रचना सुनाई","देश के आर्थिक पुनरुत्थान के लिए नए प्रयास किए जा रहे हैं","भारतीय साहित्य में प्राचीन वाङ्मय का विशेष स्थान है"],answer:2,explain:"अन्य त्रुटियाँ: सामराज→साम्राज्य, कवित्री→कवयित्री, वांगमय→वाङ्मय।"},{id:"h082",topic:"hi_economic",skill:"definition",difficulty:3,lang:"hi",source:"AUTHORED",stem:"अर्थशास्त्र में 'मांग' शब्द का विशेष अर्थ क्या है?",options:["आवश्यकता","वस्तु की कमी","केवल इच्छा","किसी वस्तु को खरीदने की इच्छा, क्षमता और तत्परता"],answer:3,explain:"नियम: आर्थिक मांग = इच्छा + भुगतान क्षमता + तत्परता। केवल इच्छा अपूर्ण है।"},{id:"h083",topic:"hi_localization",skill:"violate",difficulty:3,lang:"hi",source:"AUTHORED",stem:"कौन-सा वाक्य स्थानीयकरण की भावना के विपरीत है?",options:["वह रेलगाड़ी से सफर करता है","उसने ट्रेन की टिकट ली और ट्रेन पकड़ी","उसने लोकल से यात्रा की","उसने टिकट लिया और रेलगाड़ी में चढ़ा"],answer:2,explain:'"लोकल" = हिंदी वाक्य में अंग्रेज़ी शब्द = स्थानीयकरण उल्लंघन। ट्रेन पूर्णतः स्वीकृत ऋणशब्द है।'},{id:"h084",topic:"hi_localization",skill:"unnatural",difficulty:4,lang:"hi",source:"AUTHORED",stem:"'मुझे चाय पीने का मन कर रहा है' — इसका कौन-सा रूपांतरण सबसे अस्वाभाविक है?",options:["मुझे चाय पीने का मनोभाव हो रहा है","मुझे चाय पीने की इच्छा हो रही है","मुझे चाय पीने का मन है","मुझे चाय पीने का जी कर रहा है"],answer:0,explain:"मनोभाव = नैदानिक मनोवैज्ञानिक शब्द, सामान्य इच्छा के लिए = रजिस्टर बेमेल।"},{id:"h085",topic:"hi_multimeaning",skill:"subtle",difficulty:5,lang:"hi",source:"AUTHORED",stem:"'काल' शब्द का एक अर्थ 'समय' है। इसका एक सूक्ष्म अर्थ है:",options:["मृत्यु","भूत","वर्तमान","भविष्य"],answer:0,explain:'जाल: भूत = काल का वास्तविक अर्थ (अतीत समय), पर यह कालिक है। सबसे सूक्ष्म/दुर्लभ अर्थ = मृत्यु ("काल का ग्रास")।'},{id:"h086",topic:"hi_idiom",skill:"meaning",difficulty:3,lang:"hi",source:"AUTHORED",stem:"'कुआँ खुदवा के मेंढक पकड़ना' मुहावरे का सही अर्थ क्या है?",options:["अनजाने में किसी समस्या को बढ़ा देना","छोटे काम के लिए बड़ी तैयारी करना","अत्यधिक प्रयास करके नगण्य परिणाम प्राप्त करना","कुआँ खोदकर मेंढक पकड़ना"],answer:2,explain:'जाल: "छोटे काम के लिए बड़ी तैयारी" — समान पर "नगण्य परिणाम" तत्व नहीं।'},{id:"h087",topic:"hi_figure",skill:"not_x",difficulty:5,lang:"hi",source:"AUTHORED",stem:'"अब तो इम्तिहान में भी किस्मत पास हो जाती है, मेहनत नहीं" — इस कथन का व्यंग्यार्थ निम्न में से कौन-सा नहीं है?',options:["किस्मत ही असफल होने का कारण है","आजकल सफलता में संयोग की भूमिका बढ़ी है","परिश्रम का महत्व घटता जा रहा है","अब मेहनत से ज्यादा जुगाड़ काम आता है"],answer:0,explain:"सबसे कठिन प्रारूप। व्यंग्य कहता है किस्मत = सफलता का कारण; यह विकल्प उल्टा करता है (असफलता)। शेष तीन वैध व्यंग्यार्थ हैं।"},{id:"h088",topic:"hi_meaning",skill:"identify",difficulty:2,lang:"hi",source:"AUTHORED",stem:"'अक्षय' का अर्थ क्या है?",options:["कमज़ोर","असीमित/अविनाशी","समाप्त","सीमित"],answer:1,explain:"अक्षय = जो क्षय न हो = असीमित/अविनाशी।"},{id:"h089",topic:"hi_jati_bhav",skill:"not_x",difficulty:4,lang:"hi",source:"AUTHORED",stem:"इनमें से कौन-सा शब्द जातिवाचक से बनी भाववाचक संज्ञा नहीं है?",options:["दयालुता","मित्रता","शिक्षक","सुंदरता"],answer:2,explain:'शिक्षक = स्वयं एक जातिवाचक संज्ञा (व्यक्ति), भाववाचक नहीं। शेष "-ता" प्रत्यय से भाववाचक बने।'},{id:"e001",topic:"en_idiom",skill:"meaning",difficulty:2,lang:"en",source:"AUTHORED",stem:'What does the idiom "to keep the wolf away from the door" mean?',options:["To escape from a dangerous situation","To protect oneself from enemies","To avoid financial hardship","To stay away from risky opportunities"],answer:2,explain:'TRAP: "protect from enemies" — literal wolf reading. The idiom means to have enough money to avoid poverty/hunger.'},{id:"e002",topic:"en_idiom",skill:"meaning",difficulty:2,lang:"en",source:"AUTHORED",stem:'"Leave no stone unturned" means:',options:["to be lazy","to search everywhere / do everything possible","to build a house","to give up easily"],answer:1,explain:"To try every possible course of action to achieve something."},{id:"e003",topic:"en_idiom",skill:"meaning",difficulty:2,lang:"en",source:"AUTHORED",stem:'"Catch forty winks" means:',options:["to count money","to take a short nap","to blink rapidly","to wait forty minutes"],answer:1,explain:"Forty winks = a brief sleep / nap."},{id:"e004",topic:"en_idiom",skill:"meaning",difficulty:3,lang:"en",source:"AUTHORED",stem:'"They were left in the lurch" means they were:',options:["promoted quickly","abandoned in a difficult situation without help","given a warm welcome","sent to a quiet place"],answer:1,explain:"To leave someone in the lurch = to abandon them when they need support."},{id:"e010",topic:"en_synonym",skill:"antonym_trap",difficulty:5,lang:"en",source:"AUTHORED",stem:"Choose the synonym of PERFUNCTORY.",options:["Cursory","Earnest","Diligent","Thorough"],answer:0,explain:"TRAP: Earnest = ANTONYM (sincere/serious). This is the only paper question where students pick the antonym thinking it is the synonym."},{id:"e011",topic:"en_synonym",skill:"advanced",difficulty:4,lang:"en",source:"AUTHORED",stem:"Choose the synonym of PROCLIVITY.",options:["Impulse","Tendency","Reluctance","Aversion"],answer:1,explain:"TRAP: Impulse = sudden urge; proclivity = gradual natural inclination (different temporal aspect)."},{id:"e012",topic:"en_synonym",skill:"advanced",difficulty:4,lang:"en",source:"AUTHORED",stem:"Choose the synonym of INTRANSIGENT.",options:["Stubborn","Unyielding","Flexible","Yielding"],answer:1,explain:"TRAP: Stubborn (general obstinacy, casual) vs Unyielding (specifically refusing to compromise, formal/precise). Both work but unyielding is most precise."},{id:"e013",topic:"en_synonym",skill:"advanced",difficulty:3,lang:"en",source:"AUTHORED",stem:"Choose the synonym of MALEDICTION.",options:["Blessing","Curse","Praise","Speech"],answer:1,explain:"mal (bad) + diction (speaking) = curse."},{id:"e020",topic:"en_antonym",skill:"advanced",difficulty:3,lang:"en",source:"AUTHORED",stem:"Choose the antonym of IMPERVIOUS.",options:["Permeable","Impassive","Impregnable","Impervious"],answer:0,explain:"TRAP: Impassive (emotionally unaffected — sounds similar), Impregnable (cannot be captured). Impervious = not allowing passage; antonym = Permeable."},{id:"e021",topic:"en_antonym",skill:"advanced",difficulty:3,lang:"en",source:"AUTHORED",stem:"Choose the antonym of LUCID.",options:["Fluent","Clear","Confusing","Bright"],answer:2,explain:"TRAP: Fluent, Clear, Bright are all SYNONYMS of lucid, not antonyms."},{id:"e022",topic:"en_antonym",skill:"common",difficulty:2,lang:"en",source:"AUTHORED",stem:"Choose the antonym of VIGILANT.",options:["Alert","Watchful","Negligent","Careful"],answer:2,explain:"Vigilant = watchful; antonym = negligent (inattentive)."},{id:"e023",topic:"en_antonym",skill:"common",difficulty:3,lang:"en",source:"AUTHORED",stem:'Choose the antonym of SHRUGGED (as in "shrugged off").',options:["Dismissed","Ignored","Embraced","Rejected"],answer:2,explain:"Shrugged = dismissed/showed indifference; Embraced = accepted warmly = opposite."},{id:"e030",topic:"en_oneword",skill:"age",difficulty:5,lang:"en",source:"AUTHORED",stem:'One word for: "In extreme old age when a person behaves like a fool."',options:["Imbecility","Senescence","Superannuation","Dotage"],answer:3,explain:"Only Dotage = BOTH old age + foolish behavior. Senescence = aging only; Imbecility = foolishness only; Superannuation = retirement only."},{id:"e031",topic:"en_oneword",skill:"medical",difficulty:4,lang:"en",source:"AUTHORED",stem:'One word for: "A disease communicable through DIRECT CONTACT."',options:["Infectious","Contagious","Epidemic","Endemic"],answer:1,explain:"Infectious = spreads by ANY route (broader). Contagious = SPECIFICALLY by direct contact (narrower) = correct."},{id:"e032",topic:"en_oneword",skill:"person",difficulty:4,lang:"en",source:"AUTHORED",stem:`One word for: "Imitating a PERSON's speech and mannerisms for entertainment or ridicule."`,options:["Parody","Satire","Imitation","Mimicry"],answer:3,explain:"Mimicry = imitating a PERSON. Parody = imitating a WORK (book/film style). Satire = broader irony. Imitation = general copying."},{id:"e033",topic:"en_oneword",skill:"person",difficulty:3,lang:"en",source:"AUTHORED",stem:'One word for: "An expert judge of fine wines and food."',options:["Amateur","Connoisseur","Spectator","Novice"],answer:1,explain:"Connoisseur = expert. Others are beginners/watchers."},{id:"e040",topic:"en_spelling",skill:"identify_correct",difficulty:4,lang:"en",source:"AUTHORED",stem:"Which is the correct spelling?",options:["Supercede","Supersede","Superceed","Superscede"],answer:1,explain:'Supersede = the ONLY English word ending in -sede (Latin "supersedere"). All others end -cede (precede, exceed). Supercede is the most common misspelling in government documents.'},{id:"e041",topic:"en_spelling",skill:"identify_correct",difficulty:3,lang:"en",source:"AUTHORED",stem:"Which is the correct spelling?",options:["Aesthetic","Aesthathettic","Easthetic","Aesthatic"],answer:0,explain:"Aesthetic (relating to beauty)."},{id:"e042",topic:"en_spelling",skill:"identify_wrong",difficulty:3,lang:"en",source:"AUTHORED",stem:"Which is INCORRECTLY spelled?",options:["Obsolescence","Obsolesence","Resilience","Persistence"],answer:1,explain:'Obsolescence (needs the "sc"). Obsolesence is missing the second "c".'},{id:"e043",topic:"en_spelling",skill:"fill_blank",difficulty:3,lang:"en",source:"AUTHORED",stem:'Fill the blank with the correctly spelt word: "A ___ ruler has absolute power."',options:["despotic","despotick","desppotic","disspotic"],answer:0,explain:"despotic."},{id:"e050",topic:"en_article",skill:"definite",difficulty:3,lang:"en",source:"AUTHORED",stem:'Fill in: "___ enigmatic dodo of Mauritius was flightless."',options:["The","An","A","No article"],answer:0,explain:'TRAP: An (because "enigmatic" starts with vowel sound). But dodo = the specific, unique famous bird = definite article "The".'},{id:"e051",topic:"en_article",skill:"zero",difficulty:4,lang:"en",source:"AUTHORED",stem:'Fill in: "There was scarcely ___ hope left."',options:["a","the","no article","an"],answer:2,explain:'TRAP: "a" (most common error). scarcely/hardly/barely = negative adverbs; "a hope" implies some exists, contradicting scarcely.'},{id:"e052",topic:"en_article",skill:"double_blank",difficulty:4,lang:"en",source:"AUTHORED",stem:'Fill: "While ___ majority agreed, only ___ handful objected."',options:["the, the","the, a","a, a","a, the"],answer:1,explain:'TRAP: "the, the". "the majority" = specific group; "a handful" = indefinite quantity, not specific.'},{id:"e060",topic:"en_error",skill:"superlative",difficulty:3,lang:"en",source:"AUTHORED",stem:'Spot the error: "Of the three runners, he was the faster."',options:["the","faster → fastest","Of","three"],answer:1,explain:"For 3+ items use superlative (fastest), not comparative (faster)."},{id:"e061",topic:"en_error",skill:"double_comp",difficulty:3,lang:"en",source:"AUTHORED",stem:'Spot the error: "This is the most highest peak."',options:["This","the","most","peak"],answer:2,explain:'Double superlative: "most highest" → "highest". Never use "most" with -est.'},{id:"e062",topic:"en_error",skill:"degree",difficulty:3,lang:"en",source:"AUTHORED",stem:'Spot the error: "The room was more hot than comfortable."',options:["was","more → hotter","than","comfortable"],answer:1,explain:'TRAP: students pick "not"-style words. The real error: one-syllable adjective "hot" takes -er, not "more".'},{id:"e070",topic:"en_improvement",skill:"past_continuous",difficulty:5,lang:"en",source:"AUTHORED",stem:'Improve: "He [work] for an hour when I found him sleeping."',options:["had worked","was working","has worked","worked"],answer:1,explain:'MOST IMPORTANT TRAP: "had worked" (past perfect) = COMPLETED before finding. But he was STILL sleeping when found → action was IN PROGRESS = was working (past continuous).'},{id:"e071",topic:"en_improvement",skill:"future_perfect",difficulty:3,lang:"en",source:"AUTHORED",stem:'Improve: "By the time you arrive, I [finish] the work."',options:["will finish","will have finished","finished","am finishing"],answer:1,explain:'"By the time" + future action = future perfect (will have finished).'},{id:"e072",topic:"en_improvement",skill:"past_perfect",difficulty:4,lang:"en",source:"AUTHORED",stem:'Improve: "She said that she [complete] the report before the deadline."',options:["will complete","had completed","completes","has completed"],answer:1,explain:'"said that...before" = past action completed before another past action = past perfect (had completed).'},{id:"e080",topic:"en_voice",skill:"simple",difficulty:3,lang:"en",source:"AUTHORED",stem:'Change to passive: "Mr. Sam teaches us geometry."',options:["Geometry is taught to us by Mr. Sam","We are teaching geometry","Geometry teaches us","Mr. Sam is taught geometry"],answer:0,explain:"Simple present passive: is + taught + to us by Mr. Sam."},{id:"e081",topic:"en_voice",skill:"modal",difficulty:3,lang:"en",source:"AUTHORED",stem:'Change to active: "The laptop may not be bought by her."',options:["She might not buy the laptop","She may not buy the laptop","She will not buy","She does not buy"],answer:1,explain:`TRAP: don't change the modal. "may" stays "may", not "might".`},{id:"e082",topic:"en_voice",skill:"continuous",difficulty:4,lang:"en",source:"AUTHORED",stem:'Change to passive: "The teacher was giving detailed instructions."',options:["Detailed instructions were being given","Detailed instructions are given","Detailed instructions gave","Detailed instructions had given"],answer:0,explain:"Past continuous passive: was/were + being + past participle."},{id:"e083",topic:"en_voice",skill:"infinitive",difficulty:5,lang:"en",source:"AUTHORED",stem:'Change to passive: "Someone was to have reviewed the file."',options:["was to were been reviewed","was to have been reviewed","was reviewed","is to review"],answer:1,explain:'Perfect infinitive passive: was to + have been + past participle. "was to were been" is grammatically impossible.'},{id:"e090",topic:"en_narration",skill:"indirect_to_direct",difficulty:4,lang:"en",source:"AUTHORED",stem:'Change to direct: "He asked me if I had done my practical."',options:['He said, "Had I done your practical?"','He said, "Have you done your practical?"','He said, "Do your practical"','He said, "I have done practical"'],answer:1,explain:'RULE: When converting indirect→direct, REVERSE the backshift: "had done" → "have done". Pronoun: "I"→"you".'},{id:"e091",topic:"en_narration",skill:"direct_to_indirect",difficulty:4,lang:"en",source:"AUTHORED",stem:`Change to indirect: "Why don't we check with Mrinmay?" she said.`,options:["She suggested to check with Mrinmay","She suggested checking with Mrinmay","She suggested checked with Mrinmay","She suggested to checking"],answer:1,explain:'SUGGEST + GERUND rule: suggest/recommend/consider/avoid = always + V+ing. "suggest to do" is grammatically wrong.'},{id:"e092",topic:"en_narration",skill:"exclamatory",difficulty:4,lang:"en",source:"AUTHORED",stem:'Change to indirect: "Bravo! I have passed," said Purna.',options:["Purna expressed with excitement that she had passed","Purna joyfully exclaimed that she had passed","Purna announced that she passed","Purna told she passed"],answer:1,explain:'Exclamatory → must include emotion adverb (joyfully exclaimed). "expressed with excitement" is incomplete; "announced" is wrong for exclamatory speech.'},{id:"e100",topic:"en_grammar",skill:"sentence_type",difficulty:5,lang:"en",source:"AUTHORED",stem:'Identify the sentence type: "The connection implies that time is relative."',options:["Simple","Compound","Complex","Compound-Complex"],answer:2,explain:'TRAP: Compound-Complex (hardest distractor). Rule: ONE main clause ("connection implies") + ONE subordinate noun clause ("that time is relative") = Complex only. Compound-Complex needs TWO independent clauses.'},{id:"e101",topic:"en_grammar",skill:"participle",difficulty:5,lang:"en",source:"AUTHORED",stem:'In "Objects moving within this field follow geodesics," the word "moving" is:',options:["Gerund","Present participle acting as adjective","Main verb","Noun"],answer:1,explain:'TRAP: Gerund (because of -ing). RULE: Gerund = NOUN (subject/object); here "moving" MODIFIES "objects" (which objects? those moving) = participial adjective.'},{id:"e110",topic:"en_homonym",skill:"not_meaning",difficulty:4,lang:"en",source:"AUTHORED",stem:"Which is NOT a meaning of REGISTER?",options:["To show emotion on the face","To enroll officially","A medieval musical instrument","A cash-machine record"],answer:2,explain:"The medieval instrument = RECORDER, a different word. Real meanings: facial expression, enrollment, cash record."},{id:"e111",topic:"en_homonym",skill:"not_meaning",difficulty:4,lang:"en",source:"AUTHORED",stem:"Which is NOT a meaning of PRECIPITATE?",options:["To make happen suddenly","A chemical solid formed from solution","A steep or abrupt cliff","To fall/drop suddenly"],answer:2,explain:"A steep cliff = PRECIPICE (near-homophone, different word). Real meanings of precipitate: sudden cause, chemical solid, sudden fall."},{id:"e112",topic:"en_homonym",skill:"homophone",difficulty:3,lang:"en",source:"AUTHORED",stem:"The homophone of FLOUR is:",options:["Floor","Flower","Flair","Flyer"],answer:1,explain:"TRAP: Floor (/flɔːr/ — different vowel). Flour/Flower = /flaʊər/ (same)."}],at=864e5;async function ot(){await Qe();const e=await j(),t=Date.now(),i=new Map,n=new Map;for(const a of e){const c=a.skill?`${a.topic}.${a.skill}`:a.topic,l=Math.max(0,(t-(a.ts||t))/at),f=Math.exp(-l/14),p=i.get(c)||{w:0,c:0};p.w+=f*(a.correct?1:0),p.c+=f,i.set(c,p);const h=n.get(a.topic)||{w:0,c:0};h.w+=f*(a.correct?1:0),h.c+=f,n.set(a.topic,h)}const s=new Map;for(const[a,c]of i)s.set(a,c.c>0?c.w/c.c:.5);const o=new Map;for(const[a,c]of n.entries())o.set(a,c.c>0?c.w/c.c:.5);const r=new Map([...s.entries()].filter(([a])=>a.includes(".")));return{mastery:s,topicMastery:o,skillMastery:r,attempts:e}}function Jt(e,t){const i=e.get(t)??.5;return Math.max(1,Math.min(5,Math.round(1+i*4)))}function Wt(e){const t=new Map;for(const i of e){const n=t.get(i.question_id);(!n||i.ts>n.last)&&t.set(i.question_id,{last:i.ts,correct:i.correct})}return t}function Yt(e,t,i){const n=t.get(e);if(!n)return 1;const s=(i-n.last)/at,o=n.correct?3*Math.pow(1.6,Kt(e,t)):.5;return Math.min(1,s/o)}function Kt(e,t){var i;return(i=t.get(e))!=null&&i.correct?1:0}async function He({subject:e,topic:t,n:i=20,pool:n}={}){const{mastery:s,attempts:o}=await ot(),r=Date.now(),a=Wt(o),c=await fe();let l=n??[...J,...c];if(e&&(l=l.filter(u=>{const d=q.find(g=>g.id===u.topic);return d&&d.subject===e})),t&&(l=l.filter(u=>u.topic===t)),l.length===0)return[];if(l.length<=i)return ct(l);const f=l.map(u=>{const d=u.skill?`${u.topic}.${u.skill}`:u.topic,_=1-(s.get(d)??.5),k=1-Math.abs((u.difficulty-Jt(s,d))/5),E=Yt(u.id,a,r),A=.5*_+.3*k+.2*E+.05;return{q:u,w:A}}),p=[],h=[...f];for(;p.length<i&&h.length;){const u=h.reduce((_,k)=>_+k.w,0);let d=Math.random()*u,g=0;for(;g<h.length&&(d-=h[g].w,!(d<=0));g++);p.push(h[g].q),h.splice(g,1)}return p}function ct(e){const t=[...e];for(let i=t.length-1;i>0;i--){const n=Math.floor(Math.random()*(i+1));[t[i],t[n]]=[t[n],t[i]]}return t}async function Xt(e=rt){const t=[];for(const i of e){const n=await He({subject:i.subject,topic:i.topic,n:i.n});t.push(...n)}return ct(t)}const rt=[{subject:"hi",n:100},{subject:"en",n:100}],Zt={durationMs:2*60*60*1e3};async function ei(){const e=await Xt(rt),t=Date.now();return{questions:e,startedAt:t,deadline:t+Zt.durationMs}}async function ti(e,t){const i=[];for(let s=0;s<e.length;s++){const o=t[s]??null,r=await Ze({question:e[s],chosen:o,mode:"mock"});i.push(r)}return{...et(i),outOf:e.length}}const ii=(e=[],t="quick")=>({mode:t,questions:e,index:0,answers:Array(e.length).fill(null),revealed:!1,timed:!1,deadline:0,startedAt:Date.now(),finished:!1});function L(e,t){switch(t.type){case"set_timing":return{...e,timed:!!t.timed,deadline:t.deadline||0};case"select":return{...e,answers:e.answers.map((i,n)=>n===e.index?t.answer:i)};case"reveal":return{...e,revealed:!0};case"next":return{...e,index:Math.min(e.questions.length-1,e.index+1),revealed:!1};case"prev":return{...e,index:Math.max(0,e.index-1),revealed:!1};case"skip":return{...e,index:Math.min(e.questions.length-1,e.index+1),revealed:!1};case"finish":return{...e,finished:!0};case"load_answers":return{...e,answers:t.answers||e.answers};default:return e}}async function si(e,t,{topbar:i,go:n}){var l,f;const s=t.get("mode")||"quick";e.innerHTML=`${i("Quiz",ni(s))}<div id="qbody"><div class="ui-spinner"></div></div>`;const o=document.getElementById("qbody");if(s==="topic")return ai(o,n);if(s==="mistakes")return ci(o,n);if(s==="bookmarked")return oi(o,n);let r=[],a=!1,c=0;if(s==="mock"){const p=await ei();r=p.questions,a=!0,c=p.deadline}else{if(J.length<20){const p=q.find(u=>u.subject==="hi"),h=q.find(u=>u.subject==="en");await Promise.all([p?oe({subject:"hi",topic:p.id,label:p.label,labelHi:p.labelHi,skill:((l=p.skills)==null?void 0:l[0])||"general",difficulty:3},4):Promise.resolve(),h?oe({subject:"en",topic:h.id,label:h.label,labelHi:h.labelHi,skill:((f=h.skills)==null?void 0:f[0])||"general",difficulty:3},4):Promise.resolve()])}r=await He({n:20})}if(!r.length){o.innerHTML=`
      <div class="ui-empty">
        <div class="ui-empty__icon">📭</div>
        <h3>No questions available yet.</h3>
        <p>The PYQ question bank is being populated. Try the mock-test sample or check back shortly.</p>
        <div class="ui-empty__action">
          <button class="ui-btn ui-btn--secondary" onclick="location.hash='screen=home'">Back home</button>
        </div>
      </div>`;return}return he(o,{questions:r,mode:s,timed:a,deadline:c,go:n})}function ni(e){return{mock:"Full Mock Test",quick:"Quick Quiz",topic:"Topic Practice",mistakes:"Review Mistakes",bookmarked:"Review Bookmarks"}[e]||"Quiz"}function ai(e,t){e.innerHTML=`
    <div class="ui-card">
      <div class="ui-card__header">
        <h2 class="ui-section-head__title">Topic Practice</h2>
      </div>
      <div class="ui-card__body">
        <p class="ui-muted">Pick a subject, then optionally a topic. The adaptive engine weights your weak areas heavier.</p>

        <div class="ui-search-bar" style="margin: 16px 0;">
          <span class="ui-search-bar__icon">🔍</span>
          <input type="text" id="topic-search" class="ui-search-bar__input" placeholder="Search topics">
        </div>

        <div class="ui-filter-bar" style="margin-bottom: 16px;">
          <select id="tsubj" class="ui-select">
            <option value="">Both subjects</option>
            <option value="hi">${te.hi.label} — ${te.hi.labelHi}</option>
            <option value="en">${te.en.label} — ${te.en.labelHi}</option>
          </select>
        </div>

        <div class="ui-field">
          <label class="ui-field__label">Topic (optional)</label>
          <select id="ttopic" class="ui-select"><option value="">Any topic</option></select>
        </div>

        <div class="ui-field">
          <label class="ui-field__label">Number of questions</label>
          <select id="tn" class="ui-select"><option>10</option><option selected>20</option><option>30</option></select>
        </div>

        <button class="ui-btn" id="tstart">Start</button>
      </div>
    </div>`;const i=document.getElementById("tsubj"),n=document.getElementById("topic-search"),s=document.getElementById("ttopic");function o(){const r=i.value,a=String(n.value||"").toLowerCase().trim(),c=r?Qt(r):q;s.innerHTML='<option value="">Any topic</option>'+c.filter(l=>!a||`${l.label} ${l.labelHi}`.toLowerCase().includes(a)).map(l=>`<option value="${l.id}">${l.label}</option>`).join("")}i.addEventListener("change",o),n.addEventListener("input",o),o(),document.getElementById("tstart").addEventListener("click",async()=>{var f;const r=i.value||void 0,a=s.value||void 0,c=parseInt(document.getElementById("tn").value,10);if(a){const p=q.find(u=>u.id===a),h=J.filter(u=>u.topic===a).length;h<c&&await oe({subject:(p==null?void 0:p.subject)||r||"en",topic:a,label:(p==null?void 0:p.label)||a,labelHi:(p==null?void 0:p.labelHi)||(p==null?void 0:p.label)||a,skill:((f=p==null?void 0:p.skills)==null?void 0:f[0])||"general",difficulty:3},c-h)}const l=await He({subject:r,topic:a,n:c});if(!l.length){s.insertAdjacentHTML("afterend",'<p class="ui-muted">No questions for this selection yet.</p>');return}he(e,{questions:l,mode:"topic",timed:!1,deadline:0,go:t})})}async function oi(e,t){const i=await m("bookmarks",[]);if(!i.length){e.innerHTML=`
      <div class="ui-empty">
        <div class="ui-empty__icon">📍</div>
        <h3>No bookmarked questions yet.</h3>
        <p class="ui-muted">Tap the bookmark icon on any question to save it here.</p>
        <div class="ui-empty__action">
          <button class="ui-btn ui-btn--secondary" onclick="location.hash='screen=home'">Back home</button>
        </div>
      </div>`;return}const n=await fe(),s=[...J,...n];let o=i.map(function(r){return s.find(function(a){return a.id===r})}).filter(Boolean);if(!o.length){e.innerHTML='<div class="ui-empty"><h3>Bookmarked questions not found in question bank.</h3></div>';return}return he(e,{questions:o,mode:"bookmarked",timed:!1,deadline:0,go:t})}async function ci(e,t){const i=await j(),n=await fe(),s=[...J,...n];let r=[...new Set(i.filter(a=>!a.correct).map(a=>a.question_id))].map(a=>s.find(c=>c.id===a)).filter(Boolean);if(r=r.slice(0,40),!r.length){e.innerHTML=`
      <div class="ui-empty">
        <div class="ui-empty__icon">🎉</div>
        <h3>No mistakes to review yet.</h3>
        <div class="ui-empty__action">
          <button class="ui-btn ui-btn--secondary" onclick="location.hash='screen=home'">Back home</button>
        </div>
      </div>`;return}return he(e,{questions:r,mode:"mistakes",timed:!1,deadline:0,go:t})}function he(e,{questions:t,mode:i,timed:n,deadline:s,go:o}){let r=!1;(async()=>{const u=await m("bookmarks",[]);t[0]&&(r=u.includes(t[0].id)),f()})();let a=ii(t,i);n&&(a=L(a,{type:"set_timing",timed:!0,deadline:s}));let c=null,l=!1;function f(){var A,x,b,$,T,P,C;const u=a.questions[a.index],d=a.mode!=="mock",g=Date.now();let _="";if(a.timed){const v=Math.max(0,Math.floor((a.deadline-g)/1e3));_=`<span class="ui-timer${v<300?" ui-timer--low":""}">⏱ ${ye(Math.floor(v/3600))}:${ye(Math.floor(v/60)%60)}:${ye(v%60)}</span>`}const k=Math.round(a.index/a.questions.length*100);e.innerHTML=`
      <div class="ui-progress">
        <button class="ui-btn ui-btn--ghost quiz-exit" id="quit">✕ Exit</button>
        <div class="ui-progress__bar">
          <span class="ui-progress__bar-fill" style="width: ${k}%;"></span>
        </div>
        <span class="ui-progress__count">${a.index+1}/${a.questions.length}</span>
        ${_}
      </div>
      ${u.passage?`<div class="ui-passage hi">${V(u.passage)}</div>`:""}
      <div class="ui-stem-row">
        <div class="ui-stem${u.lang==="hi"?" hi":""}">${a.index+1}. ${V(u.stem)}</div>
        <button class="ui-btn ui-bookmark-btn" id="bm-toggle" title="Bookmark this question">${r?"🔖":"📌"}</button>
      </div>
      <div class="q-options" id="opts">
        ${u.options.map((v,w)=>ri(v,w,u,a.answers[a.index],d&&a.revealed)).join("")}
      </div>
      <div id="feedback"></div>
      <div class="ui-btn-row ui-mt-lg">
        ${a.index>0?'<button class="ui-btn ui-btn--secondary" id="prev">← Prev</button>':""}
        ${d&&a.answers[a.index]==null?'<button class="ui-btn ui-btn--secondary" id="skip">Skip</button>':""}
        ${d&&!a.revealed&&a.answers[a.index]!=null?'<button class="ui-btn" id="check">Check answer</button>':""}
        ${a.index<a.questions.length-1?'<button class="ui-btn" id="next">Next →</button>':'<button class="ui-btn" id="finish">Finish ✓</button>'}
      </div>`,e.querySelectorAll(".ui-opt").forEach(v=>{v.addEventListener("click",()=>{if(l||d&&a.revealed)return;const w=+v.dataset.idx;a=L(a,{type:"select",answer:w}),d?f():(e.querySelectorAll(".ui-opt").forEach(D=>D.classList.remove("ui-opt--selected")),v.classList.add("ui-opt--selected"))})});const E=async()=>{l=!0;try{a=L(a,{type:"reveal"});const v=a.questions[a.index];await Ze({question:v,chosen:a.answers[a.index],mode:a.mode}),f();const w=document.getElementById("feedback");if(w){w.innerHTML='<div class="ui-feedback"><span class="ui-feedback__tag">Explanation:</span> <span class="ui-muted">loading…</span></div>';const{text:D,source:W}=await Oe(v,a.answers[a.index]),U=W==="cache"?"✓ cached":W==="ai"?"✨ AI":"📖";w.innerHTML=`<div class="ui-feedback"><span class="ui-feedback__tag">Explanation ${U}:</span><br>${V(D)}</div>
            <details class="ui-followup"><summary>Still confused? Ask a follow-up (uses neurons)</summary>
            <div class="ui-followup-body"><textarea id="doubt" rows="2" class="ui-textarea" placeholder="What part is unclear?"></textarea>
            <button class="ui-btn ui-btn--secondary" id="askfu">Ask</button></div></details>`;const R=document.getElementById("askfu");R&&R.addEventListener("click",async()=>{const ge=document.getElementById("doubt").value.trim();if(!ge)return;R.textContent="…";const{text:lt}=await(await ke(async()=>{const{followup:dt}=await Promise.resolve().then(()=>Ft);return{followup:dt}},void 0)).followup(v,ge);document.getElementById("feedback").insertAdjacentHTML("beforeend",`<div class="ui-feedback" style="margin-top: 8px;"><span class="ui-feedback__tag">You asked:</span> ${V(ge)}<br><b>Answer:</b> ${V(lt)}</div>`)})}}finally{l=!1}};(A=document.getElementById("bm-toggle"))==null||A.addEventListener("click",async()=>{if(!t[a.index])return;const v=t[a.index].id,w=await m("bookmarks",[]),D=w.indexOf(v);D>=0?(w.splice(D,1),r=!1):(w.push(v),r=!0),await y("bookmarks",w),f()}),(x=document.getElementById("check"))==null||x.addEventListener("click",E),(b=document.getElementById("next"))==null||b.addEventListener("click",()=>{a=L(a,{type:"next"}),f()}),($=document.getElementById("prev"))==null||$.addEventListener("click",()=>{a=L(a,{type:"prev"}),f()}),(T=document.getElementById("skip"))==null||T.addEventListener("click",()=>{a=L(a,{type:"skip"}),f()}),(P=document.getElementById("finish"))==null||P.addEventListener("click",p),(C=document.getElementById("quit"))==null||C.addEventListener("click",()=>{confirm("Exit this session? Your progress is saved.")&&(h(),o("home"))})}async function p(){h(),a=L(a,{type:"finish"});const u=a.answers;if(a.mode==="mock"){const d=await ti(a.questions,u);sessionStorage.setItem("lastMock",JSON.stringify({questions:a.questions,answers:u,result:d})),o("review",{mode:"mock"})}else sessionStorage.setItem("lastSession",JSON.stringify({questions:a.questions,answers:u,mode:a.mode})),o("review",{mode:a.mode})}function h(){c&&clearInterval(c)}return a.timed&&(c=setInterval(()=>{Date.now()>=a.deadline?(h(),p()):f()},1e3)),f(),h}function ri(e,t,i,n,s){const o=["ui-opt"];return n===t&&!s&&o.push("ui-opt--selected"),s&&(t===i.answer?o.push("ui-opt--correct"):n===t&&o.push("ui-opt--wrong")),s&&o.push("ui-opt--disabled"),`<div class="${o.join(" ")}" data-idx="${t}"><span class="ui-opt__letter">${String.fromCharCode(65+t)}</span><span class="ui-opt__text">${V(e)}</span></div>`}function V(e){return String(e??"").replace(/[&<>"]/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[t])}function ye(e){return String(e).padStart(2,"0")}async function li(e,t,{topbar:i,go:n}){e.innerHTML=`${i("Review","Session results")}<div id="rbody"><div class="ui-spinner"></div></div>`;const s=document.getElementById("rbody"),r=(t.get("mode")||"quick")==="mock",a=r?sessionStorage.getItem("lastMock"):sessionStorage.getItem("lastSession");if(!a){s.innerHTML=`
      <div class="ui-empty">
        <h3>No session to review.</h3>
        <div class="ui-empty__action">
          <button class="ui-btn" onclick="location.hash='screen=home'">Home</button>
        </div>
      </div>`;return}const{questions:c,answers:l,result:f}=JSON.parse(a),p=f||et(c.map((u,d)=>({correct:l[d]===u.answer})));s.innerHTML=`
    <div class="ui-card ui-gap-bottom">
      <div class="ui-card__header">
        <h2 class="ui-section-head__title">${r?"Mock Test Result":"Session Result"}</h2>
      </div>
      <div class="ui-card__body">
        <div class="ui-stat-row ui-mb-md">
          <div class="ui-stat">
            <div class="ui-stat__value ui-text-good">${p.correct}</div>
            <div class="ui-stat__label">Correct</div>
          </div>
          <div class="ui-stat">
            <div class="ui-stat__value ui-text-danger">${p.wrong}</div>
            <div class="ui-stat__label">Wrong</div>
          </div>
          <div class="ui-stat">
            <div class="ui-stat__value">${p.unattempted||0}</div>
            <div class="ui-stat__label">Skipped</div>
          </div>
          <div class="ui-stat">
            <div class="ui-stat__value">${(p.marks??0).toFixed(2)}</div>
            <div class="ui-stat__label">Marks</div>
          </div>
        </div>
        ${r?'<p class="ui-muted ui-center">Real cutoff ~ 45-55%. Aim higher in weak topics (see Progress).</p>':""}
        <div class="ui-btn-row ui-mt-md">
          <button class="ui-btn" onclick="location.hash='screen=quiz&mode=quick'">Another quiz</button>
          <button class="ui-btn ui-btn--secondary" onclick="location.hash='screen=home'">Home</button>
        </div>
      </div>
    </div>

    <div class="ui-section-head">
      <h2 class="ui-section-head__title">Question by question</h2>
      <span class="ui-muted">Review every choice and explanation</span>
    </div>
    <div id="qlist"></div>`;const h=document.getElementById("qlist");c.forEach((u,d)=>{const g=l[d],_=g===u.answer,k=document.createElement("div");k.className="ui-review-item",k.innerHTML=`
      <div class="review-badge-row">
        <span class="ui-tag">${u.topic.replace(/_/g," ")}</span>
        ${_?'<span class="ui-badge ui-badge--good">✓ Correct</span>':g==null?'<span class="ui-badge ui-badge--neutral">Skipped</span>':'<span class="ui-badge ui-badge--danger">✗ Wrong</span>'}
      </div>
      <div class="review-stem${u.lang==="hi"?" hi":""}">${d+1}. ${se(u.stem)}</div>
      ${u.passage?`<details class="ui-followup"><summary>Show passage</summary><div class="ui-passage ui-mt-sm">${se(u.passage)}</div></details>`:""}
      <div class="review-options">
        ${u.options.map((E,A)=>{const x=["ui-opt","ui-opt--disabled"];return A===u.answer?x.push("ui-opt--correct"):A===g&&x.push("ui-opt--wrong"),`<div class="${x.join(" ")}"><span class="ui-opt__letter">${String.fromCharCode(65+A)}</span><span class="ui-opt__text">${se(E)}</span></div>`}).join("")}
      </div>
      <div class="expl-fb ui-mt-md" data-i="${d}"><span class="ui-muted">Loading explanation…</span></div>`,h.appendChild(k),Oe(u,g).then(({text:E,source:A})=>{const x=A==="cache"?"✓ cached":A==="ai"?"✨ AI":"📖";s.querySelector(`.expl-fb[data-i="${d}"]`).innerHTML=`<div class="ui-feedback"><span class="ui-feedback__tag">${x}</span> ${se(E)}</div>`})})}function se(e){return String(e??"").replace(/[&<>"]/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[t])}async function di(){return{v:2,exportedAt:new Date().toISOString(),attempts:await j(),generatedQuestions:await le(),errorReports:await Q(),settings:{theme:await m("theme","dark"),cf_account:await m("cf_account",""),cf_token:await m("cf_token",""),cf_model:await m("cf_model","@cf/meta/llama-3-8b-instruct"),neuron_cap:await m("neuron_cap",8e3),fb_project_id:await m("fb_project_id",""),fb_api_key:await m("fb_api_key","")},sourceCounts:{curatedQuestions:J.length}}}async function ui(){const e=await di(),t=new Blob([JSON.stringify(e,null,2)],{type:"application/json"}),i=URL.createObjectURL(t),n=document.createElement("a");n.href=i,n.download=`sscjht-backup-${new Date().toISOString().slice(0,10)}.json`,n.click(),URL.revokeObjectURL(i)}async function pi(e){if(!e||typeof e!="object")throw new Error("Invalid backup file");const t=e.settings||{};t.theme&&await y("theme",t.theme),t.cf_account!=null&&await y("cf_account",String(t.cf_account)),t.cf_token!=null&&await y("cf_token",String(t.cf_token)),t.cf_model!=null&&await y("cf_model",String(t.cf_model)),t.neuron_cap!=null&&await y("neuron_cap",Number(t.neuron_cap)||8e3),t.fb_project_id!=null&&await y("fb_project_id",String(t.fb_project_id)),t.fb_api_key!=null&&await y("fb_api_key",String(t.fb_api_key));const i={attempts:Array.isArray(e.attempts)?e.attempts.length:0,generatedQuestions:Array.isArray(e.generatedQuestions)?e.generatedQuestions.length:0,errorReports:Array.isArray(e.errorReports)?e.errorReports.length:0};if(Array.isArray(e.attempts)&&await re(e.attempts),Array.isArray(e.generatedQuestions)){const{upsertGeneratedQuestion:n}=await ke(async()=>{const{upsertGeneratedQuestion:s}=await Promise.resolve().then(()=>mt);return{upsertGeneratedQuestion:s}},void 0);for(const s of e.generatedQuestions)s&&s.id&&await n(s)}if(Array.isArray(e.errorReports)){const{setReports:n}=await ke(async()=>{const{setReports:s}=await Promise.resolve().then(()=>Rt);return{setReports:s}},void 0);await n(e.errorReports)}return i}async function mi(e,t,{topbar:i,go:n}){var A,x;e.innerHTML=`${i("Settings","Personalization + data")}<div id="sbody"><div class="ui-spinner"></div></div>`;const s=document.getElementById("sbody"),o=await m("theme",X.defaultTheme),r=await m("cf_account",""),a=await m("cf_token",""),c=await m("cf_model","@cf/meta/llama-3-8b-instruct"),l=await m("neuron_cap",X.defaultNeuronCap),f=await m("fb_project_id",""),p=await m("fb_api_key",""),h=await m("daily_goal",30),u=await Re();let d=B();const g=St(()=>{d=B(),k()});_();function _(){s.innerHTML=`
      <div class="ui-card settings-card">
        <div class="ui-card__header">
          <h2 class="ui-section-head__title">Appearance</h2>
        </div>
        <div class="ui-card__body">
          <div class="ui-field">
            <label class="ui-field__label">Theme</label>
            <select id="theme" class="ui-select">
              <option value="dark" ${o==="dark"?"selected":""}>Dark</option>
              <option value="light" ${o==="light"?"selected":""}>Light</option>
              <option value="amoled" ${o==="amoled"?"selected":""}>AMOLED</option>
              <option value="eye" ${o==="eye"?"selected":""}>Eye Comfort</option>
              <option value="contrast" ${o==="contrast"?"selected":""}>High Contrast</option>
            </select>
          </div>
        </div>
      </div>

      <div class="ui-card settings-card">
        <div class="ui-card__header">
          <h2 class="ui-section-head__title">AI Explanations</h2>
        </div>
        <div class="ui-card__body">
          <p class="ui-muted ui-text-sm">Paste your Cloudflare credentials to enable AI explanations. They're cached forever, so each concept costs only once.</p>
          <div class="ui-field">
            <label class="ui-field__label">Cloudflare Account ID</label>
            <input id="cf_account" class="ui-input" value="${F(r)}" placeholder="e.g. abcd1234">
          </div>
          <div class="ui-field">
            <label class="ui-field__label">Cloudflare API Token</label>
            <input id="cf_token" class="ui-input" type="password" value="${F(a)}" placeholder="Workers AI access token">
          </div>
          <div class="ui-field">
            <label class="ui-field__label">Model</label>
            <select id="cf_model" class="ui-select">
              <option value="@cf/meta/llama-3-8b-instruct" ${c.includes("llama-3-8b")?"selected":""}>llama-3-8b-instruct</option>
              <option value="@cf/qwen/qwen1.5-0.5b-chat" ${c.includes("qwen1.5-0.5b")?"selected":""}>qwen1.5-0.5b</option>
              <option value="@cf/meta/llama-3.1-8b-instruct" ${c.includes("3.1-8b")?"selected":""}>llama-3.1-8b-instruct</option>
            </select>
          </div>
          <div class="ui-field">
            <label class="ui-field__label">Daily neuron cap</label>
            <input id="neuron_cap" class="ui-input" type="number" min="500" max="10000" value="${l}">
          </div>
          <div class="ui-meter"><div class="ui-meter__fill" style="width: ${Math.min(100,u.used/u.cap*100)}%;"></div></div>
          <p class="ui-muted ui-text-xs">Used ${u.used} / ${u.cap} neurons today.</p>
          <button class="ui-btn" id="save-ai">Save AI settings</button>
        </div>
      </div>

      <div class="ui-card settings-card">
        <div class="ui-card__header">
          <h2 class="ui-section-head__title">Cloud Sync</h2>
        </div>
        <div class="ui-card__body">
          <p class="ui-muted ui-text-sm">Syncs your progress across devices via <b>Firebase Firestore</b> (REST API, free tier). Create a project at <b>console.firebase.google.com</b>, enable Firestore, then paste the Web API Key and Project ID below.</p>
          <div class="ui-field">
            <label class="ui-field__label">Project ID</label>
            <input id="fb_project_id" class="ui-input" value="${F(f)}" placeholder="my-project-abc12">
          </div>
          <div class="ui-field">
            <label class="ui-field__label">Web API Key</label>
            <input id="fb_api_key" class="ui-input" type="password" value="${F(p)}" placeholder="AIzaSy...">
          </div>
          <button class="ui-btn" id="save-fb">Save and connect</button>
          <div id="fb-status" class="ui-mt-md"></div>
        </div>
      </div>

      <div class="ui-card settings-card">
        <div class="ui-card__header">
          <h2 class="ui-section-head__title">Daily Goal</h2>
        </div>
        <div class="ui-card__body">
          <p class="ui-muted ui-text-sm">Set a daily question-answer target. Your progress shows on the home screen.</p>
          <div class="ui-field">
            <label class="ui-field__label">Questions per day</label>
            <input id="daily_goal" class="ui-input" type="number" min="5" max="500" value="${h}">
          </div>
          <button class="ui-btn" id="save-goal">Save goal</button>
        </div>
      </div>

      <div class="ui-card">
        <div class="ui-card__header">
          <h2 class="ui-section-head__title">Backup</h2>
        </div>
        <div class="ui-card__body">
          <p class="ui-muted ui-text-sm">Export your progress to a file and restore it later on any device.</p>
          <div class="ui-btn-row">
            <button class="ui-btn ui-btn--secondary" id="backup">Export backup (.json)</button>
            <label class="ui-btn ui-btn--secondary" style="cursor: pointer;">
              Import backup
              <input id="backup-file" type="file" accept="application/json" hidden>
            </label>
          </div>
          <p class="ui-muted ui-mt-sm" style="font-size: 0.75rem;">Imports attempts, generated questions, diagnostics history, and settings.</p>
        </div>
      </div>`,k(),document.getElementById("theme").addEventListener("change",async b=>{await y("theme",b.target.value),document.documentElement.setAttribute("data-theme",b.target.value)}),document.getElementById("save-ai").addEventListener("click",async()=>{await y("cf_account",document.getElementById("cf_account").value.trim()),await y("cf_token",document.getElementById("cf_token").value.trim()),await y("cf_model",document.getElementById("cf_model").value),await y("neuron_cap",parseInt(document.getElementById("neuron_cap").value,10)||X.defaultNeuronCap),E("AI settings saved.")}),document.getElementById("save-fb").addEventListener("click",async()=>{await y("fb_project_id",document.getElementById("fb_project_id").value.trim()),await y("fb_api_key",document.getElementById("fb_api_key").value.trim());const b=await xe();E(b?"Firebase connected.":"Could not connect. Check Project ID and API Key."),b&&(d=B(),k())}),document.getElementById("save-goal").addEventListener("click",async()=>{const b=parseInt(document.getElementById("daily_goal").value,10);b>=5&&b<=500?(await y("daily_goal",b),E("Daily goal saved.")):E("Enter a number between 5 and 500.")})}function k(){var v,w,D,W;const b=document.getElementById("fb-status");if(!b)return;if(!d.configured){b.innerHTML='<p class="ui-text-sm ui-muted">Enter credentials above and click <b>Save and connect</b>.</p>';return}const $=d.online?'<span class="ui-badge ui-badge--info">Online</span>':'<span class="ui-badge ui-badge--warn">Offline</span>',T=((v=d.user)==null?void 0:v.id)||"",P='<span class="ui-badge ui-badge--good">Firebase</span>',C=d.signedIn?`
      <div class="ui-card__body ui-sync-status">
        <div class="ui-sync-row">
          ${P}
          ${$}
          <span class="ui-sync-email ui-muted">Device: ${F(T.slice(0,20))}...</span>
        </div>
        <div class="ui-sync-row${d.syncInProgress?"":" ui-sync-row--last"}">
          <span class="ui-badge ui-badge--neutral">Last sync: ${d.lastSyncAt||"never"}</span>
          ${d.syncInProgress?'<span class="ui-spinner ui-spinner--small" style="margin: 0;"></span>':""}
        </div>
        <div class="ui-btn-row${d.syncInProgress?"":" ui-mt-sm"}">
          <button class="ui-btn" id="fb-push" ${d.syncInProgress?"disabled":""}>
            ${d.syncInProgress?"Syncing...":"Sync now ↑"}
          </button>
          <button class="ui-btn ui-btn--secondary" id="fb-pull" ${d.syncInProgress?"disabled":""}>Pull ↓</button>
          <button class="ui-btn ui-btn--ghost" id="fb-copy-id" title="Copy device ID">Copy ID</button>
        </div>
      </div>`:`
      <div class="ui-card__body ui-sync-status">
        <div class="ui-sync-row">
          ${P}
          ${$}
          <span class="ui-sync-email ui-muted">Firebase configured and ready.</span>
        </div>
      </div>`;b.innerHTML=C,(w=document.getElementById("fb-push"))==null||w.addEventListener("click",async()=>{const U=document.getElementById("fb-push");U.disabled=!0,U.textContent="Syncing...";const R=await xt();E(R.ok?`Pushed ${R.pushed} items.`:"Push failed: "+R.reason),d=B(),k()}),(D=document.getElementById("fb-pull"))==null||D.addEventListener("click",async()=>{const U=document.getElementById("fb-pull");U.disabled=!0,U.textContent="Pulling...";const R=await $t();E(R.ok?"Sync complete.":"Pull failed: "+R.reason),d=B(),k()}),(W=document.getElementById("fb-copy-id"))==null||W.addEventListener("click",()=>{T&&navigator.clipboard.writeText(T).then(()=>E("Device ID copied."),()=>{})})}return(A=document.getElementById("backup"))==null||A.addEventListener("click",ui),(x=document.getElementById("backup-file"))==null||x.addEventListener("change",async b=>{var T,P;const $=(T=b.target.files)==null?void 0:T[0];if($)try{const C=await $.text(),v=JSON.parse(C),w=await pi(v);(P=v.settings)!=null&&P.theme&&document.documentElement.setAttribute("data-theme",v.settings.theme),E(`Imported: ${w.attempts} attempts, ${w.generatedQuestions} gen. questions, ${w.errorReports} reports.`),location.reload()}catch(C){E(`Import failed: ${C.message}`)}finally{b.target.value=""}}),g;function E(b){const $=document.getElementById("flash");$&&$.remove(),s.insertAdjacentHTML("afterbegin",`<div class="ui-toast" id="flash">${F(b)}</div>`),setTimeout(()=>{var T;return(T=document.getElementById("flash"))==null?void 0:T.remove()},3500)}}function F(e){return String(e??"").replace(/[&<>"]/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[t])}async function fi(e,t,{topbar:i,go:n}){e.innerHTML=`${i("Progress")}<div id="pbody"><div class="ui-spinner"></div></div>`;const s=document.getElementById("pbody"),o=await tt(),{mastery:r,topicMastery:a,skillMastery:c}=await ot();if(!o.total){s.innerHTML=`
      <div class="ui-empty">
        <h3>No attempts yet.</h3>
        <div class="ui-empty__action">
          <button class="ui-btn" onclick="location.hash='screen=quiz&mode=quick'">Start a quick quiz</button>
        </div>
      </div>`;return}const l=o.topics.map(d=>{const g=Ce(d.topic)||{label:d.topic},_=Math.round(d.accuracy*100),k=_>=75?"ui-meter--success":_>=50?"ui-meter--warning":"ui-meter--danger";return`
      <div class="ui-topic-row">
        <div class="ui-topic-row__header">
          <span class="ui-topic-row__label">${ve(g.label)}</span>
          <span class="ui-topic-row__stats">${d.correct}/${d.total} · ${_}%</span>
        </div>
        <div class="ui-meter ${k}"><div class="ui-meter__fill" style="width: ${_}%;"></div></div>
      </div>`}).join(""),p=[...c.entries()].map(([d,g])=>({k:d,v:g})).sort((d,g)=>d.v-g.v).slice(0,14).map(({k:d,v:g})=>{const _=Math.round(g*100);return`<div class="ui-list-item"><span class="ui-text-sm">${ve(d)}</span><span class="ui-muted">${_}%</span></div>`}).join(""),u=[...a.entries()].map(([d,g])=>({k:d,v:g})).sort((d,g)=>d.v-g.v).slice(0,10).map(({k:d,v:g})=>{const _=Ce(d)||{label:d};return`<div class="ui-list-item"><span class="ui-text-sm">${ve(_.label)}</span><span class="ui-muted">${Math.round(g*100)}%</span></div>`}).join("");s.innerHTML=`
    <div class="ui-card ui-gap-bottom">
      <div class="ui-card__header">
        <h2 class="ui-section-head__title">Overall</h2>
      </div>
      <div class="ui-card__body">
        <div class="ui-stat-row ui-mb-md">
          <div class="ui-stat">
            <div class="ui-stat__value">${o.total}</div>
            <div class="ui-stat__label">Answered</div>
          </div>
          <div class="ui-stat">
            <div class="ui-stat__value">${Math.round(o.accuracy*100)}%</div>
            <div class="ui-stat__label">Accuracy</div>
            <div class="ui-stat__sub">All attempts</div>
          </div>
          <div class="ui-stat">
            <div class="ui-stat__value">${o.streakDays}</div>
            <div class="ui-stat__label">Day streak</div>
          </div>
        </div>
        <div class="ui-ring-row">
          <div class="ui-ring ui-ring--glow" style="--p: ${Math.round(o.accuracy*100)};">
            <div class="ui-ring__inner">${Math.round(o.accuracy*100)}%</div>
          </div>
          <p class="ui-muted">This view mirrors the exact weights used by the adaptive picker, so weaknesses stay actionable.</p>
        </div>
      </div>
    </div>

    <div class="ui-card ui-gap-bottom">
      <div class="ui-card__header">
        <h2 class="ui-section-head__title">Mastery by topic</h2>
      </div>
      <div class="ui-card__body">
        <p class="ui-muted ui-text-xs ui-mb-md">Sorted weakest-first — the engine drills these hardest.</p>
        ${l}
      </div>
    </div>

    <div class="ui-card ui-gap-bottom">
      <div class="ui-card__header">
        <h2 class="ui-section-head__title">Weakest topic skills</h2>
      </div>
      <div class="ui-card__body">
        <p class="ui-muted ui-text-xs ui-mb-md">Topic-level mastery that feeds drill selection.</p>
        ${u?`<div class="ui-list">${u}</div>`:'<p class="ui-muted">More data needed.</p>'}
      </div>
    </div>

    <div class="ui-card">
      <div class="ui-card__header">
        <h2 class="ui-section-head__title">Finest-grained mastery (topic.skill)</h2>
      </div>
      <div class="ui-card__body">
        <p class="ui-muted ui-text-xs ui-mb-md">These are the exact weights the adaptive picker uses.</p>
        ${p?`<div class="ui-list">${p}</div>`:'<p class="ui-muted">More data needed.</p>'}
      </div>
    </div>`}function ve(e){return String(e??"").replace(/[&<>"]/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[t])}async function hi(e,t,{topbar:i,go:n}){e.innerHTML=`${i("Diagnostics","Errors + recovery log")}<div id="dbody"><div class="ui-spinner"></div></div>`;const s=document.getElementById("dbody"),o=await Q();if(!o.length){s.innerHTML=`
      <div class="ui-empty">
        <h3>No error reports yet.</h3>
        <p class="ui-muted">When the app catches a runtime failure, it will appear here with recovery steps.</p>
        <div class="ui-empty__action">
          <div class="ui-btn-row">
            <button class="ui-btn ui-btn--secondary" onclick="location.hash='screen=home'">Home</button>
          </div>
        </div>
      </div>`;return}s.innerHTML=`
    <div class="ui-card ui-gap-bottom">
      <div class="ui-card__header">
        <h2 class="ui-section-head__title">Error report panel</h2>
      </div>
      <div class="ui-card__body">
        <p class="ui-muted ui-text-sm">This stores the exact runtime failure, where it happened, and how the app recovered.</p>
        <div class="ui-btn-row">
          <button class="ui-btn ui-btn--secondary" id="clear">Clear reports</button>
          <button class="ui-btn ui-btn--secondary" id="home">Home</button>
        </div>
      </div>
    </div>
    <div id="reports" class="ui-gap-top"></div>`,document.getElementById("clear").addEventListener("click",async()=>{confirm("Clear all error reports?")&&(await Xe(),location.hash="screen=diagnostics")}),document.getElementById("home").addEventListener("click",()=>{location.hash="screen=home"});const r=document.getElementById("reports");r.innerHTML=o.map(a=>`
    <div class="ui-card ui-mb-sm">
      <div class="ui-card__body">
        <div class="ui-btn-row ui-mb-sm">
          <span class="ui-badge ui-badge--neutral">${new Date(a.ts).toLocaleTimeString()}</span>
          <span class="ui-badge ui-badge--neutral">${Y(a.screen)}</span>
          <span class="ui-badge ${a.resolved?"ui-badge--good":"ui-badge--warn"}">${a.resolved?"Resolved":"Open"}</span>
        </div>
        <h3>${Y(a.title)}</h3>
        <p class="ui-muted ui-text-pre">${Y(a.message||"(no message)")}</p>
        ${a.stack?`<details class="ui-followup"><summary>Stack trace</summary><pre class="error-stack ui-mt-sm">${Y(a.stack)}</pre></details>`:""}
        <div class="ui-mt-md">
          <strong>Recovery steps</strong>
          <ol class="ui-list--bullets">
            ${(a.recoverySteps||[]).map(c=>`<li>${Y(c)}</li>`).join("")||'<li class="ui-muted">None recorded</li>'}
          </ol>
        </div>
        <div class="ui-btn-row ui-mt-md">
          <button class="ui-btn ui-btn--secondary" data-resolve="${a.id}">${a.resolved?"Mark unresolved":"Mark resolved"}</button>
          <button class="ui-btn ui-btn--secondary" data-step="${a.id}">Add recovery step</button>
        </div>
      </div>
    </div>
  `).join(""),r.querySelectorAll("[data-resolve]").forEach(a=>{a.addEventListener("click",async()=>{const c=a.getAttribute("data-resolve"),l=o.find(f=>f.id===c);l&&(await Ke(c,!l.resolved),location.hash="screen=diagnostics")})}),r.querySelectorAll("[data-step]").forEach(a=>{a.addEventListener("click",async()=>{const c=a.getAttribute("data-step"),l=prompt("Add a recovery step:");l&&(await Ye(c,l),location.hash="screen=diagnostics")})})}function Y(e){return String(e??"").replace(/[&<>"]/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[t])}const Me={home:Vt,quiz:si,review:li,settings:mi,progress:fi,diagnostics:hi},Ee=document.getElementById("app");let be=null;function Z(e,t="App error"){var i,n;console.error(e),We(e,{title:t,recoverySteps:["Captured at app-level error boundary","Retry the current screen","Go home to recover to the dashboard"]}).catch(()=>{}),Ee.innerHTML=`
    <div class="error-container">
      <div class="ui-card error-card">
        <h2>${t}</h2>
        <p class="ui-muted">The app hit a runtime problem while loading.</p>
        <pre class="error-stack">${String((e==null?void 0:e.stack)||(e==null?void 0:e.message)||e)}</pre>
        <div class="ui-btn-row" style="margin-top: 12px;">
          <button class="ui-btn" id="retry">Retry</button>
          <button class="ui-btn ui-btn--secondary" id="home">Go home</button>
        </div>
      </div>
    </div>`,(i=document.getElementById("retry"))==null||i.addEventListener("click",ce),(n=document.getElementById("home"))==null||n.addEventListener("click",()=>{location.hash="screen=home"})}async function Ue(){const e=await m("theme","dark");document.documentElement.setAttribute("data-theme",e||"dark"),document.title=`${X.name} - ${X.subtitle}`,await xe(),It().catch(()=>{})}function gi(e,t){const i=B(),n=i.configured?i.online?"ðŸŸ¢":"ðŸ”´":"",s=i.configured?i.online?"Cloud connected":"Offline mode":"";return`
    <div class="ui-topbar">
      <div class="ui-brand">${e}${t?`<span class="sub">${t}</span>`:""}</div>
      <div class="ui-topbar__nav">
        ${n?`<span class="ui-conn-dot" title="${s}">${n}</span>`:""}
        <button class="ui-nav-btn" data-go="diagnostics" title="Diagnostics"><span class="ui-nav-btn__icon">ðŸ”</span> Diag</button>
        <button class="ui-nav-btn" data-go="progress" title="Progress"><span class="ui-nav-btn__icon">ðŸ“Š</span> Progress</button>
        <button class="ui-nav-btn" data-go="settings" title="Settings"><span class="ui-nav-btn__icon">âš™ï¸</span> Settings</button>
      </div>
    </div>`}async function ce(){try{const e=location.hash.replace(/^#/,"");if(e.includes("access_token")||e.includes("type=recovery")){await xe(),history.replaceState(null,"",window.location.pathname),location.hash="screen=home";return}const t=new URLSearchParams(e),i=t.get("screen")||"home",n=Me[i]||Me.home;if(be)try{be()}catch{}const s=document.createElement("div");s.className="ui-page",Ee.innerHTML="",Ee.appendChild(s),s.addEventListener("click",o=>{var c;const r=o.target instanceof Element?o.target:null,a=(c=r==null?void 0:r.closest("[data-go]"))==null?void 0:c.getAttribute("data-go");a&&(location.hash=`screen=${a}`)}),be=await n(s,t,{topbar:gi,go:(o,r)=>{let a=`screen=${o}`;if(r)for(const c in r)a+=`&${c}=${encodeURIComponent(r[c])}`;location.hash=a}})}catch(e){Z(e)}}window.addEventListener("hashchange",ce);window.addEventListener("error",e=>Z(e.error||e.message,"Unhandled error"));window.addEventListener("unhandledrejection",e=>Z(e.reason,"Unhandled rejection"));const Le=location.hash,yi=new URLSearchParams(window.location.search).has("code"),vi=Le.includes("access_token")||Le.includes("type=recovery");vi||yi?Ue().then(()=>{history.replaceState(null,"",window.location.pathname),location.hash="screen=home",ce()}).catch(e=>Z(e,"Startup error")):Ue().then(ce).catch(e=>Z(e,"Startup error"));
