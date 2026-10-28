(function(){
"use strict";
var S={d:null,p:"all",q:"",c:null};
var $=function(s){return document.querySelector(s)};
var L=function(){return document.documentElement.lang=="en"?"en":"ar"};
var U={
ar:{h:"خريطة الشهادات المهنية",sub:"اختر المسار وشاهد الشهادات المناسبة من الأساسيات حتى الاحتراف. اضغط على أي شهادة لتعرف عنها أكثر.",all:"كل المسارات",ph:"ابحث عن شهادة أو جهة",
 b:"مبتدئ",i:"متوسط",a:"متقدم",bd:"الأساسيات والدخول للمجال",id:"ممارسة عملية وتخصص",ad:"خبرة متقدمة وقيادة تقنية",cnt:"شهادة",open:"الصفحة الرسمية",more:"التفاصيل",back:"إغلاق",none:"لا توجد شهادات مطابقة",issuer:"الجهة المانحة",level:"المستوى",gen:"مناسبة لجميع المسارات"},
en:{h:"Professional Certification Roadmap",sub:"Pick a path and see suitable certifications from the basics to expert level. Tap any certification to learn more.",all:"All paths",ph:"Search certification or issuer",
 b:"Beginner",i:"Intermediate",a:"Advanced",bd:"Fundamentals and entry to the field",id:"Hands-on practice and specialization",ad:"Advanced expertise and technical leadership",cnt:"certifications",open:"Official page",more:"Details",back:"Close",none:"No matching certifications",issuer:"Issuer",level:"Level",gen:"Suitable for all paths"}
};
var CSS=".ct{max-width:980px;margin:0 auto}.ct *{box-sizing:border-box}.ct h2{margin:0 0 6px}.ct-sub{margin:0 0 18px;color:var(--muted);line-height:1.8}"+
".ct-q{width:100%;padding:12px 16px;border-radius:14px;border:1px solid var(--line);background:var(--card);color:var(--text);font:inherit;margin-bottom:12px}.ct-q:focus{outline:2px solid var(--accent2);outline-offset:1px}"+
".ct-pills{display:flex;gap:8px;overflow-x:auto;padding:2px 0 12px;scrollbar-width:none;margin-bottom:8px}.ct-pills::-webkit-scrollbar{display:none}@media(min-width:800px){.ct-pills{flex-wrap:wrap;overflow:visible}}"+
".ct-pill{flex:none;font:inherit;font-size:13.5px;padding:8px 14px;border-radius:99px;border:1px solid var(--line);background:var(--card);color:var(--text);cursor:pointer;white-space:nowrap}.ct-pill.on{background:var(--accent);border-color:var(--accent);color:#fff}"+
".ct-lane{position:relative;display:grid;grid-template-columns:44px minmax(0,1fr);gap:0 14px;padding-bottom:26px}.ct-lane:last-child{padding-bottom:0}"+
".ct-lane::before{content:'';position:absolute;inset-inline-start:21px;top:44px;bottom:0;border-inline-start:2px dashed var(--line)}.ct-lane:last-child::before{display:none}"+
".ct-n{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:17px;color:#fff;background:var(--c)}"+
".ct-hd{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 12px;margin:2px 0 12px}.ct-hd b{font-size:18px}.ct-hd span{color:var(--muted);font-size:13.5px}.ct-hd i{font-style:normal;font-size:12px;color:var(--muted);margin-inline-start:auto}"+
".ct-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:10px}@media(min-width:800px){.ct-g{grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}}"+
".ct-c{display:flex;flex-direction:column;gap:5px;min-width:0;padding:13px 14px;border-radius:14px;background:var(--card);border:1px solid var(--line);color:var(--text);transition:.18s;border-top:3px solid var(--c);cursor:pointer;text-align:start;font:inherit}.ct-c:hover{transform:translateY(-3px);border-color:var(--c)}"+
".ct-is{font-size:11.5px;color:var(--muted);display:flex;align-items:center;gap:6px}.ct-is::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--c)}"+
".ct-ac{font-size:17px;font-weight:700;line-height:1.3;overflow-wrap:anywhere;direction:ltr;text-align:start}.ct-nm{font-size:12.5px;color:var(--muted);line-height:1.5;direction:ltr;text-align:start;overflow-wrap:anywhere}.ct-go{margin-top:auto;padding-top:6px;font-size:12px;color:var(--accent2)}"+
".ct-hdr{cursor:pointer;display:flex;flex-direction:column;gap:5px}.ct-hdr .ct-go{padding-top:0;margin-top:2px}.ct-c.big{grid-column:1/-1;cursor:default;transform:none;border-color:var(--c);padding:16px}.ct-c.big .ct-ac{font-size:20px}.ct-c.big .ct-nm{font-size:13.5px}"+
".ct-d{margin:10px 0 4px;font-size:14.5px;line-height:1.9;color:var(--text)}.ct-meta{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12.5px;color:var(--muted);margin:2px 0 12px}.ct-meta b{color:var(--text);font-weight:600}"+
".ct-act{display:flex;flex-wrap:wrap;gap:8px}.ct-btn{font:inherit;font-size:14px;text-decoration:none;color:#fff;background:var(--accent);border:0;border-radius:10px;padding:9px 16px;cursor:pointer}.ct-bk{font:inherit;font-size:14px;color:var(--text);background:none;border:1px solid var(--line);border-radius:10px;padding:9px 16px;cursor:pointer}"+
".ct-e{color:var(--muted);padding:6px 0 4px;font-size:14px}"+
"@media(max-width:640px){.ct-lane{grid-template-columns:34px minmax(0,1fr);gap:0 10px}.ct-n{width:34px;height:34px;font-size:15px}.ct-lane::before{inset-inline-start:16px;top:34px}.ct-c{padding:11px 11px}.ct-ac{font-size:15px}}";
function css(){if(!$("#ct-css")){var s=document.createElement("style");s.id="ct-css";s.textContent=CSS+".hero.cp-on .search,.hero.cp-on .orgs,.hero.cp-on .stats{display:none!important}";document.head.appendChild(s)}}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function T(){return U[L()]}
var COL={b:"#2fb67c",i:"#4f6bed",a:"#8a4fe0"};
function card(c,k){var t=T();return'<div class="ct-c" style="--c:'+COL[k]+'" role="button" tabindex="0" data-c="'+esc(c.a)+'"><span class="ct-is">'+esc(c.i)+'</span><span class="ct-ac">'+esc(c.a)+'</span><span class="ct-nm">'+esc(c.n)+'</span><span class="ct-go">'+t.more+" ‹</span></div>"}
function openCert(a){var c=S.d.certs.filter(function(x){return x.a==a})[0];if(!c)return;var t=T(),d=$("#ctd");
 $("#ctb").innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span class="tag" style="background:color-mix(in srgb,'+COL[c.l]+' 20%,transparent);color:'+COL[c.l]+'">'+t[c.l]+'</span><span class="st" style="background:#8884">'+esc(c.i)+'</span></div><h2 style="margin:14px 0 4px;direction:ltr;text-align:start">'+esc(c.a)+'</h2><div style="color:var(--muted);direction:ltr;text-align:start;margin-bottom:12px">'+esc(c.n)+'</div><div class="meta"><span>🏢 '+t.issuer+": "+esc(c.i)+"</span><span>🎓 "+t.level+": "+t[c.l]+"</span>"+(c.p.indexOf("*")>-1?"<span>🧭 "+t.gen+"</span>":"")+'</div><p class="dsc">'+esc(L()=="ar"?c.d:c.e)+'</p><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:14px"><a class="btn p" href="'+esc(c.u)+'" target="_blank" rel="noopener noreferrer">'+t.open+' ↗</a><button class="btn" id="ctx">'+t.back+"</button></div>"+(typeof socHtml=="function"&&socHtml()?'<div class="fol"><div class="soc">'+socHtml()+"</div></div>":"");
 $("#ctx").onclick=function(){d.close()};try{track("cto",a);d.querySelector("a.btn.p").onclick=function(){track("ctg",a)}}catch(e){}d.showModal()}
function match(c){var q=S.q.trim().toLowerCase();if(S.p!="all"&&c.p.indexOf("*")<0&&c.p.indexOf(S.p)<0)return false;return!q||(c.a+" "+c.n+" "+c.i).toLowerCase().indexOf(q)>-1}
function draw(){if(!S.d)return;var t=T(),P=S.d.paths;
 var pills='<button class="ct-pill'+(S.p=="all"?" on":"")+'" data-p="all">'+t.all+"</button>"+P.map(function(p){return'<button class="ct-pill'+(S.p==p.id?" on":"")+'" data-p="'+p.id+'">'+p.ico+" "+esc(L()=="ar"?p.ar:p.en)+"</button>"}).join("");
 var lanes="";
 ["b","i","a"].forEach(function(k,ix){var list=S.d.certs.filter(function(c){return c.l==k&&match(c)});
  lanes+='<div class="ct-lane" style="--c:'+COL[k]+'"><div class="ct-n">'+(ix+1)+'</div><div><div class="ct-hd"><b>'+t[k]+"</b><span>"+t[k+"d"]+"</span><i>"+list.length+" "+t.cnt+'</i></div>'+(list.length?'<div class="ct-g">'+list.map(function(c){return card(c,k)}).join("")+"</div>":'<div class="ct-e">'+t.none+"</div>")+"</div></div>"});
 var keep=document.activeElement&&document.activeElement.id=="ct-q";
 $("#ct").innerHTML='<div class="ct"><h2>'+t.h+'</h2><p class="ct-sub">'+t.sub+'</p><input class="ct-q" id="ct-q" type="search" placeholder="'+t.ph+'" value="'+esc(S.q)+'" autocomplete="off"><div class="ct-pills" id="ct-pills">'+pills+"</div>"+lanes+"</div>";
 if(keep){var q=$("#ct-q");q.focus();q.setSelectionRange(q.value.length,q.value.length)}
 var on=$(".ct-pill.on");if(on&&!keep&&window.innerWidth<800)try{on.parentNode.scrollTo({left:on.offsetLeft-20,behavior:"auto"})}catch(e){}}
function hash(){try{history.replaceState(null,"","/certs"+(S.p=="all"?"":"#"+S.p))}catch(e){}}
function init(){if(S.inited)return;S.inited=true;css();if(!$("#ctd")){var dg=document.createElement("dialog");dg.id="ctd";dg.innerHTML='<div id="ctb"></div>';document.body.appendChild(dg);dg.addEventListener("click",function(e){var r=dg.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dg.close()})}
 $("#ct").addEventListener("click",function(e){var b;
  if(b=e.target.closest("[data-p]")){S.p=b.dataset.p;S.c=null;draw();hash();return}
  
  if(e.target.closest("a"))return;
  if(b=e.target.closest("[data-c]"))openCert(b.dataset.c)});
 $("#ct").addEventListener("keydown",function(e){if(e.key=="Enter"){var b=e.target.closest("[data-c]");if(b)openCert(b.dataset.c)}});
 $("#ct").addEventListener("input",function(e){if(e.target.id=="ct-q"){S.q=e.target.value;S.c=null;draw()}});
 var h=location.hash.replace(/^#(certs)?\/?/,"");if(h&&S.d.paths.some(function(p){return p.id==h}))S.p=h}
window.CT={open:function(){var el=$("#ct");if(!el)return;document.querySelector(".hero").classList.add("cp-on");
  if(S.d){draw();return}
  Promise.all([fetch("/paths.json?v=3").then(function(r){return r.json()}),fetch("/api/certs").then(function(r){if(!r.ok)throw 0;return r.json()}).catch(function(){return null})]).then(function(a){S.d=a[0];if(a[1])S.d.certs=a[1];init();draw()}).catch(function(){el.innerHTML='<p style="color:var(--muted)">⚠</p>'})},
 close:function(){var h=document.querySelector(".hero");if(h)h.classList.remove("cp-on")},
 render:function(){if(S.d&&$("#certs").style.display!="none")draw()}};
})();
