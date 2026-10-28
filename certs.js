(function(){
"use strict";
var S={d:null,p:null,c:null};
var $=function(s){return document.querySelector(s)};
var L=function(){return document.documentElement.lang=="en"?"en":"ar"};
var U={
ar:{h:"خريطة الشهادات المهنية",sub:"اختر المسار لتعرض الشهادات المناسبة له من الأساسيات حتى الاحتراف.",more:"مسارات إضافية",cnt:"شهادة",
 b:"مبتدئ",i:"متوسط",a:"متقدم",bd:"الأساسيات والدخول للمجال",id:"ممارسة عملية وتخصص",ad:"خبرة متقدمة وقيادة تقنية",
 open:"الصفحة الرسمية",close:"إغلاق",issuer:"الجهة المانحة",level:"المستوى",gen:"مناسبة لجميع المسارات"},
en:{h:"Professional Certification Roadmap",sub:"Pick a path to see suitable certifications from the basics to expert level.",more:"More paths",cnt:"certifications",
 b:"Beginner",i:"Intermediate",a:"Advanced",bd:"Fundamentals and entry to the field",id:"Hands-on practice and specialization",ad:"Advanced expertise and technical leadership",
 open:"Official page",close:"Close",issuer:"Issuer",level:"Level",gen:"Suitable for all paths"}
};
var COL={b:"#2fb67c",i:"#4f6bed",a:"#8a4fe0"};
var CSS=".ct{max-width:900px;margin:0 auto}.ct *{box-sizing:border-box}.ct h2{margin:0 0 6px}.ct-sub{margin:0 0 18px;color:var(--muted);line-height:1.8}"+
".ct-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}@media(min-width:800px){.ct-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}}"+
".ct-card{font:inherit;color:var(--text);text-align:start;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:6px;cursor:pointer;transition:.18s;min-width:0}.ct-card:hover{transform:translateY(-3px);border-color:var(--accent)}.ct-card.sel{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}"+
".ct-card .e{font-size:28px;line-height:1}.ct-card b{font-size:15px;line-height:1.4}.ct-card i{font-style:normal;font-size:12px;color:var(--accent2);margin-top:auto}"+
".ct-sb{margin:26px 0 10px;font-size:16px;color:var(--muted)}.ct-x .ct-card{padding:11px}.ct-x .e{font-size:22px}.ct-x b{font-size:13.5px}"+
".ct-open{grid-column:1/-1;background:color-mix(in srgb,var(--accent) 6%,transparent);border:1px solid var(--line);border-radius:16px;padding:14px}"+
".ct-root{font:inherit;border:0;cursor:pointer;display:inline-flex;align-items:center;gap:8px;background:var(--accent);color:#fff;border-radius:12px;padding:9px 16px;font-weight:700;font-size:15px;max-width:100%}.ct-root span{margin-inline-start:6px;opacity:.8;font-size:13px}"+
".ct-tr{list-style:none;margin:0;margin-inline-start:22px;padding:6px 0 0;padding-inline-start:18px;border-inline-start:2px solid var(--line)}.ct-tr>li{position:relative;margin:0 0 12px;padding-top:6px}.ct-tr>li::before{content:'';position:absolute;inset-inline-start:-18px;top:30px;width:18px;border-top:2px solid var(--line)}"+
".ct-lv{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:var(--card);border:1px solid var(--line);border-inline-start:4px solid var(--c)}.ct-lv b{font-size:15px}.ct-lv span{color:var(--muted);font-size:12.5px;flex:1;line-height:1.5}.ct-lv em{font-style:normal;font-size:12px;color:var(--muted);flex:none}"+
".ct-ls{list-style:none;margin:8px 0 0;margin-inline-start:6px;padding:0;padding-inline-start:16px;border-inline-start:2px solid var(--line)}.ct-ls>li{position:relative;margin:0 0 8px}.ct-ls>li::before{content:'';position:absolute;inset-inline-start:-16px;top:23px;width:16px;border-top:2px solid var(--line)}"+
".ct-r{font:inherit;color:var(--text);width:100%;display:flex;align-items:center;gap:10px;text-align:start;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--card);cursor:pointer;min-width:0}.ct-r:hover{border-color:var(--c)}.ct-r.on{border-color:var(--c);background:color-mix(in srgb,var(--c) 10%,var(--card))}"+
".ct-r b{font-size:14.5px;direction:ltr;flex:none;max-width:48%;overflow-wrap:anywhere}.ct-r span{flex:1;min-width:0;font-size:12px;color:var(--muted);direction:ltr;text-align:start;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ct-r em{font-style:normal;font-size:11.5px;color:var(--muted);flex:none}"+
".ct-ch{flex:none;width:8px;height:8px;border-inline-end:2px solid var(--muted);border-bottom:2px solid var(--muted);transform:rotate(45deg);transition:.2s}.ct-r.on .ct-ch{transform:rotate(-135deg)}"+
".ct-det{margin:6px 0 4px;padding:14px;border-radius:12px;background:var(--bg);border:1px solid var(--line);border-top:3px solid var(--c)}.ct-det h4{margin:0 0 2px;font-size:16px;direction:ltr;text-align:start}.ct-det .fn{font-size:12.5px;color:var(--muted);direction:ltr;text-align:start;margin-bottom:10px}"+
".ct-det p{margin:0 0 12px;font-size:14px;line-height:1.9}.ct-meta{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12.5px;color:var(--muted);margin-bottom:12px}.ct-meta b{color:var(--text);font-weight:600}"+
".ct-act{display:flex;flex-wrap:wrap;gap:8px}.ct-go{font:inherit;font-size:14px;text-decoration:none;color:#fff;background:var(--accent);border:0;border-radius:10px;padding:9px 16px;cursor:pointer}.ct-cl{font:inherit;font-size:14px;color:var(--text);background:none;border:1px solid var(--line);border-radius:10px;padding:9px 16px;cursor:pointer}"+
"@media(max-width:640px){.ct-open{padding:8px}.ct-tr{margin-inline-start:10px;padding-inline-start:12px}.ct-tr>li::before{inset-inline-start:-12px;width:12px}.ct-ls{margin-inline-start:0;padding-inline-start:10px}.ct-ls>li::before{inset-inline-start:-10px;width:10px}.ct-r{padding:9px 9px}.ct-det{padding:11px}.ct-lv span{display:none}.ct-r b{max-width:55%}}"+
".hero.cp-on .search,.hero.cp-on .orgs,.hero.cp-on .stats{display:none!important}";
function css(){if(!$("#ct-css")){var s=document.createElement("style");s.id="ct-css";s.textContent=CSS;document.head.appendChild(s)}}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function T(){return U[L()]}
function pname(p){return L()=="ar"?p.ar:p.en}
function certsOf(p){return S.d.certs.filter(function(c){return c.p.indexOf("*")>-1||c.p.indexOf(p.id)>-1})}
function detail(c){var t=T(),k=c.l;
 return'<div class="ct-det" style="--c:'+COL[k]+'"><h4>'+esc(c.a)+'</h4><div class="fn">'+esc(c.n)+"</div><p>"+esc(L()=="ar"?c.d:c.e)+'</p><div class="ct-meta"><span>'+t.issuer+": <b>"+esc(c.i)+"</b></span><span>"+t.level+": <b>"+t[k]+"</b></span>"+(c.p.indexOf("*")>-1?"<span>"+t.gen+"</span>":"")+
 '</div><div class="ct-act"><a class="ct-go" href="'+esc(c.u)+'" target="_blank" rel="noopener noreferrer">'+t.open+' ↗</a><button class="ct-cl" data-cc="1">'+t.close+"</button></div></div>"}
function tree(){var t=T(),p=S.p,cs=certsOf(p),h='<div class="ct-open"><button class="ct-root" data-close="1" aria-expanded="true">'+p.ico+" "+esc(pname(p))+"<span>✕</span></button><ul class=\"ct-tr\">";
 ["b","i","a"].forEach(function(k){var l=cs.filter(function(c){return c.l==k});if(!l.length)return;
  h+='<li><div class="ct-lv" style="--c:'+COL[k]+'"><b>'+t[k]+"</b><span>"+t[k+"d"]+"</span><em>"+l.length+" "+t.cnt+'</em></div><ul class="ct-ls">';
  l.forEach(function(c){var on=S.c==c.a;h+='<li style="--c:'+COL[k]+'"><button class="ct-r'+(on?" on":"")+'" data-c="'+esc(c.a)+'" aria-expanded="'+on+'"><b>'+esc(c.a)+"</b><span>"+esc(c.n)+'</span><em>'+esc(c.i)+'</em><i class="ct-ch"></i></button>'+(on?detail(c):"")+"</li>"});
  h+="</ul></li>"});
 return h+"</ul></div>"}
function cols(){return window.matchMedia("(min-width:800px)").matches?3:2}
function group(list,cls){var t=T(),c=cols(),k=-1,h="";list.forEach(function(p,i){if(S.p&&S.p.id==p.id)k=i});var end=k<0?-1:Math.min(list.length-1,k-k%c+c-1);
 list.forEach(function(p,i){h+='<button class="ct-card'+(k==i?" sel":"")+'" data-p="'+p.id+'" aria-expanded="'+(k==i)+'"><span class="e">'+p.ico+"</span><b>"+esc(pname(p))+"</b><i>"+certsOf(p).length+" "+t.cnt+"</i></button>";if(i==end)h+=tree()});
 return'<div class="ct-grid '+cls+'">'+h+"</div>"}
function draw(){if(!S.d)return;var t=T(),P=S.d.paths;
 $("#ct").innerHTML='<div class="ct"><h2>'+t.h+'</h2><p class="ct-sub">'+t.sub+"</p>"+group(P.filter(function(p){return!p.x}),"")+'<h3 class="ct-sb">'+t.more+"</h3>"+group(P.filter(function(p){return p.x}),"ct-x")+"</div>"}
function hash(){var h="#certs";if(S.p){h+="/"+S.p.id;if(S.c)h+="/"+encodeURIComponent(S.c)}try{history.replaceState(null,"",location.pathname+location.search+h)}catch(e){}}
function toCard(id){var c=id&&$('.ct-card[data-p="'+id+'"]');if(c)window.scrollTo({top:c.getBoundingClientRect().top+window.pageYOffset-80,behavior:"smooth"})}
function init(){if(S.inited)return;S.inited=true;css();
 $("#ct").addEventListener("click",function(e){var b;
  if(b=e.target.closest("[data-p]")){var id=b.dataset.p,same=S.p&&S.p.id==id;S.c=null;S.p=same?null:S.d.paths.filter(function(p){return p.id==id})[0];draw();hash();if(!same)toCard(id);return}
  if(e.target.closest("[data-close]")){var id2=S.p&&S.p.id;S.p=null;S.c=null;draw();hash();toCard(id2);return}
  if(e.target.closest("[data-cc]")){var r=$(".ct-r.on");S.c=null;draw();hash();return}
  if(b=e.target.closest("[data-c]")){var a=b.dataset.c;S.c=S.c==a?null:a;draw();hash()}});
 var h=location.hash.replace(/^#certs\/?/,"").split("/").filter(Boolean);
 if(h[0]){S.p=S.d.paths.filter(function(p){return p.id==h[0]})[0]||null;if(S.p&&h[1]){var a=decodeURIComponent(h[1]);if(S.d.certs.some(function(c){return c.a==a}))S.c=a}}
 var rz;window.addEventListener("resize",function(){clearTimeout(rz);rz=setTimeout(function(){if(S.d&&$("#certs").style.display!="none"&&S.cols!=cols()){S.cols=cols();draw()}},150)})}
window.CT={open:function(){var el=$("#ct");if(!el)return;document.querySelector(".hero").classList.add("cp-on");
  if(S.d){draw();return}
  fetch("/paths.json?v=3").then(function(r){return r.json()}).then(function(d){S.d=d;init();draw()}).catch(function(){el.innerHTML='<p style="color:var(--muted)">⚠</p>'})},
 close:function(){var h=document.querySelector(".hero");if(h)h.classList.remove("cp-on")},
 render:function(){if(S.d&&$("#certs").style.display!="none")draw()}};
})();
