(function(){
"use strict";
var S={pk:{},data:null,p:null,open:{},r:null,l:null,trail:[]};
var $=function(s){return document.querySelector(s)};
var L=function(){return document.documentElement.lang=="en"?"en":"ar"};
var U={
ar:{h:"مسارات الأمن السيبراني",sub:"اختر مسارك، ثم استكشف الأدوار الوظيفية ومستوياتها وكيف تنتقل بينها.",more:"مسارات إضافية",all:"كل المسارات",roles:"أدوار",diff:"الصعوبة",about:"عن الدور",lv:"المستوى",exp:"الخبرة",yrs:"سنة",entry:"بدون خبرة",from:"جاء من",next:"الخطوة التالية",mk:"مسميات شائعة في سوق العمل السعودي",trail:"رحلتك",clear:"مسح",
src:"الأدوار والمستويات والانتقالات: الإطار السعودي لكوادر الأمن السيبراني (سيوف) – الهيئة الوطنية للأمن السيبراني. المسميات: إعلانات وظيفية سعودية منشورة.",
grad:"خريج بمؤهل علمي",tech:"أدوار فنية للأمن السيبراني",core:"أدوار رئيسية للأمن السيبراني",mgmt:"أدوار إدارية أو موارد بشرية",lvl:"المستوى",levels:"مستويات",rng:"المستويات",none:"—",goto:"الانتقال إلى هذا المستوى",certs:"الشهادات المهنية المناسبة",certsE:"من الأساسيات إلى الاحتراف",cc:"شهادة",cb:"مبتدئ",ci:"متوسط",ca:"متقدم",ar_note:"",sum:"ملخص الدور",tasks:"المهمات والمسؤوليات"},
en:{h:"Cybersecurity Career Paths",sub:"Pick a path, then explore its roles, levels and how to move between them.",more:"More paths",all:"All paths",roles:"roles",diff:"Difficulty",about:"About the role",lv:"Level",exp:"Experience",yrs:"yrs",entry:"Entry",from:"Comes from",next:"Next step",mk:"Common titles in the Saudi job market",trail:"Your journey",clear:"Clear",
src:"Roles, levels and transitions: Saudi Cybersecurity Workforce Framework (SCyWF) – National Cybersecurity Authority. Titles: public Saudi job postings.",
grad:"Graduate with academic qualification",tech:"Cybersecurity technical roles",core:"Cybersecurity core roles",mgmt:"Management or other HR roles",lvl:"Level",levels:"levels",rng:"Levels",none:"—",goto:"Go to this level",certs:"Suitable professional certifications",certsE:"From fundamentals to expert",cc:"certifications",cb:"Beginner",ci:"Intermediate",ca:"Advanced",ar_note:"Official description (Arabic)",sum:"Role summary",tasks:"Tasks and responsibilities"}
};
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
var CSS=".cp{max-width:900px;margin:0 auto}.cp *{box-sizing:border-box}.cp-h h2{margin:0 0 6px}.cp-h p{margin:0 0 18px;color:var(--muted)}"+
".cp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}@media(min-width:800px){.cp-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}}"+
".cp-card{font:inherit;color:var(--text);text-align:start;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:6px;cursor:pointer;transition:.18s;min-width:0}.cp-card:hover{transform:translateY(-3px);border-color:var(--accent)}"+
".cp-card .e{font-size:28px;line-height:1}.cp-card b{font-size:15px;line-height:1.4}.cp-card small{color:var(--muted);font-size:12.5px;line-height:1.5}.cp-card i{font-style:normal;font-size:12px;color:var(--accent2);margin-top:auto}"+
".cp-sr{display:flex;align-items:center;gap:6px}.cp-lbl{font-size:12px;color:var(--muted)}.cp-st{color:#f5a524;letter-spacing:1px;font-size:13px}.cp-st s{text-decoration:none;color:var(--line)}"+
".cp-sub{margin:26px 0 10px;font-size:16px;color:var(--muted)}.cp-x .cp-card{padding:11px}.cp-x .e{font-size:22px}.cp-x b{font-size:13.5px}"+
".cp-back{font:inherit;background:none;border:0;color:var(--accent2);cursor:pointer;padding:6px 0;font-size:14px}"+
".cp-ph{display:flex;gap:12px;align-items:center;margin:6px 0 14px}.cp-ph .e{font-size:40px;line-height:1}.cp-ph h2{margin:0;font-size:22px;line-height:1.3}.cp-ph small{color:var(--muted)}"+
".cp-trail{display:flex;gap:6px;align-items:center;overflow-x:auto;padding:8px 0;margin-bottom:6px;scrollbar-width:none}.cp-trail::-webkit-scrollbar{display:none}.cp-trail>span{color:var(--muted);font-size:12px;flex:none}"+
".cp-t{flex:none;font:inherit;font-size:12.5px;padding:5px 11px;border-radius:99px;border:1px solid var(--line);background:var(--card);color:var(--text);cursor:pointer}.cp-t.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 16%,transparent)}.cp-t.c{color:var(--muted)}"+
".cp-card.sel{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}.cp-open{grid-column:1/-1;background:color-mix(in srgb,var(--accent) 6%,transparent);border:1px solid var(--line);border-radius:16px;padding:14px}.cp-x2{margin-inline-start:6px;opacity:.8;font-size:13px}.cp-root{font:inherit;border:0;cursor:pointer;display:inline-flex;align-items:center;gap:8px;background:var(--accent);color:#fff;border-radius:12px;padding:9px 16px;font-weight:700;font-size:15px;max-width:100%}"+
".cp-br{list-style:none;margin:0;margin-inline-start:22px;padding:6px 0 0;padding-inline-start:18px;border-inline-start:2px solid var(--line)}.cp-br>li{position:relative;margin:0 0 12px;padding-top:6px}"+
".cp-br>li::before{content:'';position:absolute;inset-inline-start:-18px;top:34px;width:18px;border-top:2px solid var(--line)}"+
".cp-role{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden;transition:border-color .2s}.cp-role.open{border-color:var(--accent)}.cp-role.fl{animation:cpf 1.4s}@keyframes cpf{0%,60%{box-shadow:0 0 0 3px var(--accent2)}100%{box-shadow:0 0 0 0 transparent}}"+
".cp-rh{font:inherit;color:var(--text);width:100%;background:none;border:0;display:flex;align-items:center;gap:10px;padding:12px 14px;cursor:pointer;text-align:start}.cp-rh>div{flex:1;min-width:0}.cp-rh b{display:block;font-size:15px;line-height:1.4}.cp-rh small{color:var(--muted);font-size:12px;display:block;overflow-wrap:anywhere}"+
".cp-dots{display:flex;gap:3px;flex:none}.cp-dots i{width:8px;height:8px;border-radius:50%;background:var(--line)}.cp-dots i.y{background:var(--accent2)}.cp-ch{flex:none;width:9px;height:9px;border-inline-end:2px solid var(--muted);border-bottom:2px solid var(--muted);transform:rotate(45deg);transition:.2s;margin-inline:4px}.open .cp-ch{transform:rotate(-135deg)}"+
".cp-rb{display:none;padding:0 14px 14px}.open>.cp-rb{display:block}.cp-intro{color:var(--muted);font-size:13.5px;line-height:1.8;margin:2px 0 14px}"+
".cp-lad{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;position:relative}.cp-lad::before{content:'';position:absolute;inset-inline:8%;top:21px;border-top:2px dashed var(--line);z-index:0}"+
".cp-l{position:relative;z-index:1;font:inherit;color:var(--text);background:var(--bg);border:1.5px solid var(--line);border-radius:12px;padding:7px 2px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:0}.cp-l b{font-size:14px}.cp-l small{font-size:10.5px;color:var(--muted);white-space:nowrap}"+
".cp-l.on{background:var(--accent);border-color:var(--accent);color:#fff}.cp-l.on small{color:#ffffffcc}.cp-l[disabled]{opacity:.35;cursor:default;border-style:dashed}"+
".cp-d{margin-top:14px;padding:14px;border-radius:12px;background:var(--bg);border:1px solid var(--line)}.cp-d h4{margin:0 0 8px;font-size:14px}.cp-d p{margin:0 0 10px;font-size:14px;line-height:1.85}.cp-d p.s{font-weight:600}.cp-note{font-size:11.5px;color:var(--muted);margin:-4px 0 8px}"+
".cp-g{margin-top:12px}.cp-g>span{display:block;font-size:12.5px;color:var(--muted);margin-bottom:6px}.cp-cs{display:flex;flex-wrap:wrap;gap:6px}.cp-c{font:inherit;font-size:12.5px;padding:6px 11px;border-radius:10px;border:1px solid var(--line);background:var(--card);color:var(--text);text-align:start}"+
"button.cp-c{cursor:pointer;border-color:var(--accent2)}button.cp-c:hover{background:color-mix(in srgb,var(--accent) 14%,transparent)}.cp-c.p{color:var(--muted);border-style:dashed}"+
".cp-m{margin-top:14px}.cp-m span{display:block;font-size:12.5px;color:var(--muted);margin-bottom:6px}.cp-m i{font-style:normal;font-size:12px;padding:4px 10px;border-radius:99px;background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--accent2);display:inline-block;margin:0 0 6px;margin-inline-end:6px}"+
".cp-cnt{flex:none;font-size:12px;color:var(--muted)}.cp-lv{margin-inline-start:6px;padding-inline-start:16px}.cp-lv>li{padding-top:0;margin:0 0 8px}.cp-lv>li::before{top:22px;inset-inline-start:-16px;width:16px}.cp-lb{font:inherit;color:var(--text);width:100%;display:flex;align-items:center;gap:10px;text-align:start;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg);cursor:pointer}.cp-lb b{font-size:14px}.cp-lb em{font-style:normal;color:var(--muted);font-size:12px;flex:1}.cp-lb.on{background:var(--accent);border-color:var(--accent);color:#fff}.cp-lb.on em{color:#ffffffcc}.cp-lb.on .cp-ch{border-color:#fff}.cp-s{margin-inline-start:4px;padding-inline-start:14px;padding-top:0}.cp-s>li{padding-top:0;margin:0 0 7px}.cp-s>li::before{top:19px;inset-inline-start:-14px;width:14px}.cp-n{font:inherit;display:flex;justify-content:space-between;align-items:center;gap:8px;width:100%;text-align:start;padding:8px 11px;border-radius:9px;border:1px solid var(--accent2);background:var(--card);color:var(--text);cursor:pointer;font-size:13px}.cp-n em{font-style:normal;color:var(--muted);font-size:12px;flex:none}.cp-n.p{border-style:dashed;border-color:var(--line);color:var(--muted);cursor:default}button.cp-n:hover{background:color-mix(in srgb,var(--accent) 12%,var(--card))}.cp-d{margin:8px 0 2px;padding:12px}.cp-n.on{background:color-mix(in srgb,var(--accent) 14%,var(--card))}.cp-pk{margin:6px 0 4px;padding:10px 12px}.cp-pk p{font-size:13px;margin:0 0 8px}.cp-go{font:inherit;font-size:13px;color:#fff;background:var(--accent);border:0;border-radius:9px;padding:7px 14px;cursor:pointer}.cp-lbs{cursor:default}a.cp-n{text-decoration:none}.cp-n small{display:block;color:var(--muted);font-size:11.5px;margin-top:2px}.cp-src{margin:28px 0 4px;font-size:12px;color:var(--muted);line-height:1.8}@media(max-width:640px){.cp-open{padding:8px}.cp-br{margin-inline-start:10px;padding-inline-start:12px}.cp-br>li::before{inset-inline-start:-12px;width:12px}.cp-rb{padding:0 8px 10px}.cp-rh{padding:11px 10px}.cp-lv{margin-inline-start:0;padding-inline-start:10px}.cp-lv>li::before{inset-inline-start:-10px;width:10px}.cp-d{padding:9px}.cp-s{margin-inline-start:0;padding-inline-start:10px}.cp-s>li::before{inset-inline-start:-10px;width:10px}.cp-pk{padding:8px 9px}.cp-n,.cp-lb{padding:8px 9px}}.hero.cp-on .search,.hero.cp-on .orgs,.hero.cp-on .stats{display:none!important}";
function css(){if(!$("#cp-css")){var s=document.createElement("style");s.id="cp-css";s.textContent=CSS;document.head.appendChild(s)}}
function T(){return U[L()]}
function pname(p){return L()=="ar"?p.ar:p.en}
function rname(r){return L()=="ar"?r.ar:r.en}
function stars(n){var o="";for(var i=1;i<=4;i++)o+=i<=n?"★":"<s>★</s>";return'<span class="cp-sr"><span class="cp-lbl">'+T().diff+'</span> <span class="cp-st" role="img" aria-label="'+T().diff+": "+n+'/4">'+o+"</span></span>"}
function pathOf(rid,pref){var P=S.data.paths;if(pref&&pref.roles.indexOf(rid)>-1)return pref;for(var i=0;i<P.length;i++)if(P[i].roles.indexOf(rid)>-1)return P[i];return null}
function lvls(r){return Object.keys(r.lv).map(Number).sort()}
function expTxt(n){var e=S.data.exp[n];return e=="0"?T().entry:e+" "+T().yrs}
function peek(k,n){var t=T(),R=S.data.roles[k],d=R.lv[n];if(!d)return"";
 var h='<div class="cp-d cp-pk">';if(L()=="en")h+='<div class="cp-note">'+t.ar_note+"</div>";
 d.d.forEach(function(p){h+='<p dir="rtl" style="text-align:'+(L()=="en"?"right":"start")+'">'+esc(p)+"</p>"});
 return h+'<button class="cp-go" data-go="'+k+"|"+n+'">'+t.goto+" ›</button></div>"}
function ref(x,ctx){var t=T(),k=x[0],n=x[1],R=S.data.roles[k];
 if(R){var key=ctx+k+"|"+n,on=!!S.pk[key];return'<li><button class="cp-n'+(on?" on":"")+'" data-pk="'+key+'" aria-expanded="'+on+'"><span>'+esc(rname(R))+"</span><em>"+t.lvl+" "+n+"</em></button>"+(on?peek(k,n):"")+"</li>"}
 if(k=="mgmt")return'<li><span class="cp-n p"><span>'+t.mgmt+"</span></span></li>";
 return'<li><span class="cp-n p"><span>'+t[k]+"</span><em>"+t.lvl+" "+n+"</em></span></li>"}
function grp(label,list,ctx){var t=T();return'<div class="cp-g"><span>'+label+'</span><ul class="cp-br cp-s">'+(list.length?list.map(function(x){return ref(x,ctx)}).join(""):'<li><span class="cp-n p"><span>'+t.none+"</span></span></li>")+"</ul></div>"}
function detail(rid){var t=T(),R=S.data.roles[rid],n=S.l,d=R.lv[n];if(!d)return"";
 var h='<div class="cp-d">';
 if(L()=="en")h+='<div class="cp-note">'+t.ar_note+"</div>";
 d.d.forEach(function(p,i){h+='<p class="'+(i==0&&d.d.length>1?"s":"")+'" dir="rtl" style="text-align:'+(L()=="en"?"right":"start")+'">'+esc(p)+"</p>"});
 h+=grp("⬅ "+t.from,d.f,"f")+grp("➡ "+t.next,d.n,"n");
 if(R.m.length)h+='<div class="cp-g"><span>'+t.mk+'</span><ul class="cp-br cp-s">'+R.m.slice(0,8).map(function(m){return'<li><span class="cp-n p"><span dir="ltr">'+esc(m)+"</span></span></li>"}).join("")+"</ul></div>";
 return h+"</div>"}
function roleHtml(rid){var t=T(),R=S.data.roles[rid],ls=lvls(R),open=!!S.open[rid],h="";
 h+='<li><div class="cp-role'+(open?" open":"")+'" id="r-'+rid+'"><button class="cp-rh" data-r="'+rid+'" aria-expanded="'+open+'"><div><b>'+esc(R.ar)+"</b><small>"+esc(R.en)+'</small></div><span class="cp-cnt">'+ls.length+" "+t.levels+'</span><span class="cp-ch"></span></button><div class="cp-rb">';
 if(open){h+='<div class="cp-intro">'+(L()=="en"?'<div class="cp-note">'+t.ar_note+"</div>":"")+'<span dir="rtl">'+esc(R.intro||"")+'</span></div><ul class="cp-br cp-lv">';
  ls.forEach(function(n){var on=S.r==rid&&S.l==n;h+='<li><button class="cp-lb'+(on?" on":"")+'" data-l="'+rid+"|"+n+'" aria-expanded="'+on+'"><b>'+t.lvl+" "+n+"</b><em>"+expTxt(n)+'</em><i class="cp-ch"></i></button>'+(on?detail(rid):"")+"</li>"});
  h+="</ul>"}
 return h+"</div></div></li>"}
function trailHtml(){var t=T();if(!S.trail.length)return"";var h='<div class="cp-trail"><span>'+t.trail+"</span>";
 S.trail.forEach(function(x,i){var R=S.data.roles[x[0]];h+='<button class="cp-t'+(i==S.trail.length-1?" on":"")+'" data-t="'+i+'">'+esc(rname(R))+" · "+x[1]+"</button>"});
 return h+'<button class="cp-t c" data-clear="1">'+t.clear+" ✕</button></div>"}
function cols(){return window.matchMedia("(min-width:800px)").matches?3:2}
function certsHtml(p){var t=T(),cs=(S.data.certs||[]).filter(function(c){return c.p.indexOf("*")>-1||c.p.indexOf(p.id)>-1});if(!cs.length)return"";
 var open=!!S.open.__c,h='<li><div class="cp-role'+(open?" open":"")+'" id="r-certs"><button class="cp-rh" data-r="__c" aria-expanded="'+open+'"><div><b>'+t.certs+"</b><small>"+t.certsE+'</small></div><span class="cp-cnt">'+cs.length+" "+t.cc+'</span><span class="cp-ch"></span></button><div class="cp-rb">';
 if(open){h+='<ul class="cp-br cp-lv">';["b","i","a"].forEach(function(k){var l=cs.filter(function(c){return c.l==k});if(!l.length)return;
  h+='<li><div class="cp-lb cp-lbs"><b>'+t["c"+k]+"</b><em>"+l.length+'</em></div><ul class="cp-br cp-s">'+l.map(function(c){return'<li><a class="cp-n" href="'+esc(c.u)+'" target="_blank" rel="noopener noreferrer"><span dir="ltr">'+esc(c.a)+' <small>'+esc(c.n)+"</small></span><em>"+esc(c.i)+" ↗</em></a></li>"}).join("")+"</ul></li>"});h+="</ul>"}
 return h+"</div></div></li>"}
function tree(){var t=T(),p=S.p;
 return'<div class="cp-open">'+trailHtml()+'<button class="cp-root" data-close="1" aria-expanded="true">'+p.ico+" "+esc(pname(p))+'<span class="cp-x2">✕</span></button><ul class="cp-br">'+p.roles.map(roleHtml).join("")+certsHtml(p)+"</ul></div>"}
function rg(p){var a=[];p.roles.forEach(function(r){lvls(S.data.roles[r]).forEach(function(n){a.push(n)})});return Math.min.apply(null,a)+"–"+Math.max.apply(null,a)}
function group(list,cls){var t=T(),c=cols(),k=-1,h="";
 list.forEach(function(p,i){if(S.p&&S.p.id==p.id)k=i});var end=k<0?-1:Math.min(list.length-1,k-k%c+c-1);
 list.forEach(function(p,i){h+='<button class="cp-card'+(k==i?" sel":"")+'" data-p="'+p.id+'" aria-expanded="'+(k==i)+'"><span class="e">'+p.ico+"</span><b>"+esc(pname(p))+"</b>"+"<i>"+p.roles.length+" "+t.roles+" · "+t.rng+" "+rg(p)+"</i></button>";if(i==end)h+=tree()});
 return'<div class="cp-grid '+cls+'">'+h+"</div>"}
function home(){var t=T(),P=S.data.paths;
 return'<div class="cp"><div class="cp-h"><h2>'+t.h+"</h2><p>"+t.sub+"</p></div>"+group(P.filter(function(p){return!p.x}),"")+'<h3 class="cp-sub">'+t.more+"</h3>"+group(P.filter(function(p){return p.x}),"cp-x")+"</div>"}
function hash(){var h="#paths";if(S.p){h+="/"+S.p.id;if(S.r){h+="/"+S.r;if(S.l)h+="/"+S.l}}try{history.replaceState(null,"",location.pathname+location.search+h)}catch(e){}}
function draw(){if(!S.data)return;$("#cp").innerHTML=home()}
function select(pid){var same=S.p&&S.p.id==pid;S.r=null;S.l=null;S.open={};
 if(same){S.p=null}else{S.p=S.data.paths.filter(function(p){return p.id==pid})[0]||null;if(S.p&&S.p.roles.length==1)S.open[S.p.roles[0]]=true}
 draw();hash();var c=$('.cp-card[data-p="'+pid+'"]');if(c&&!same)window.scrollTo({top:c.getBoundingClientRect().top+window.pageYOffset-80,behavior:"smooth"})}
function go(rid,n,keep){var p=pathOf(rid,S.p);if(!p)return;S.p=p;S.r=rid;S.l=n;S.open[rid]=true;
 if(!keep){var i=-1;S.trail.forEach(function(x,k){if(x[0]==rid&&x[1]==n)i=k});if(i>-1)S.trail=S.trail.slice(0,i+1);else S.trail.push([rid,n])}
 draw();hash();var e=$("#r-"+rid);if(e){e.classList.add("fl");var y=e.getBoundingClientRect().top+window.pageYOffset-80;window.scrollTo({top:y,behavior:"smooth"})}}
function init(){if(S.inited)return;S.inited=true;css();
 $("#cp").addEventListener("click",function(e){var b;
  if(b=e.target.closest("[data-p]"))return select(b.dataset.p);
  if(e.target.closest("[data-close]")){var id=S.p&&S.p.id;S.p=null;S.r=null;S.l=null;draw();hash();var c=id&&$('.cp-card[data-p="'+id+'"]');if(c)window.scrollTo({top:c.getBoundingClientRect().top+window.pageYOffset-80,behavior:"smooth"});return}
  if(b=e.target.closest("[data-pk]")){var k=b.dataset.pk;S.pk[k]=!S.pk[k];return draw()}
  if(b=e.target.closest("[data-go]")){S.pk={};var a=b.dataset.go.split("|");return go(a[0],+a[1])}
  if(b=e.target.closest("[data-l]")){var a=b.dataset.l.split("|");if(b.disabled)return;S.pk={};if(S.r==a[0]&&S.l==+a[1]){S.l=null;draw();hash();return}return go(a[0],+a[1])}
  if(b=e.target.closest("[data-t]")){var x=S.trail[+b.dataset.t];S.trail=S.trail.slice(0,+b.dataset.t+1);return go(x[0],x[1],true)}
  if(e.target.closest("[data-clear]")){S.trail=[];draw();return}
  if(b=e.target.closest("[data-r]")){var r=b.dataset.r;S.open[r]=!S.open[r];if(!S.open[r]&&S.r==r){S.r=null;S.l=null}draw();hash()}});
 var h=location.hash.replace(/^#paths\/?/,"").split("/").filter(Boolean);
 if(h[0]){S.p=S.data.paths.filter(function(p){return p.id==h[0]})[0]||null;if(S.p&&h[1]&&S.data.roles[h[1]]){S.open[h[1]]=true;S.r=h[1];if(h[2]&&S.data.roles[h[1]].lv[h[2]]){S.l=+h[2];S.trail=[[h[1],S.l]]}}}}
var rz;window.addEventListener("resize",function(){clearTimeout(rz);rz=setTimeout(function(){if(S.data&&$("#paths").style.display!="none"&&S.cols!=cols()){S.cols=cols();draw()}},150)});
window.CP={open:function(){var el=$("#cp");if(!el)return;document.querySelector(".hero").classList.add("cp-on");
  if(S.data){draw();return}
  fetch("/paths.json?v=2").then(function(r){return r.json()}).then(function(d){S.data=d;init();draw()}).catch(function(){el.innerHTML='<p style="color:var(--muted)">⚠</p>'})},
 close:function(){var h=document.querySelector(".hero");if(h)h.classList.remove("cp-on")},
 render:function(){if(S.data&&$("#paths").style.display!="none")draw()}};
})();
