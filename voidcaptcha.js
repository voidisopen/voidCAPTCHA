// voidcaptcha.js
(function(){
  const COLORS=["red","blue"];
  const BASE_TINY=15.19202383;
  let target=null, tries=0, cooldown=5000, blockedUntil=0, verified=false, countdownTimer=null;

  function createOverlay(){
    if(document.getElementById("voidcaptcha-overlay")) return;

    // full screen overlay
    const overlay=document.createElement("div");
    overlay.id="voidcaptcha-overlay";
    overlay.style.cssText=`
      position:fixed;top:0;left:0;width:100%;height:100%;
      background:#000;display:flex;justify-content:center;align-items:center;
      z-index:2147483647;flex-direction:column;
    `;

    // container card
    const card=document.createElement("div");
    card.style.cssText=`
      background:#111214;color:#eee;padding:26px;border-radius:14px;
      text-align:center;box-shadow:0 18px 60px rgba(0,0,0,0.7);
      max-width:380px;width:92%;display:flex;flex-direction:column;align-items:center;
    `;

    const title=document.createElement("h2"); 
    title.innerText="VoidCaptcha"; 
    title.style.margin="0 0 10px 0"; 
    title.style.fontSize="20px";

    // checkbox container
    const cbContainer=document.createElement("div"); 
    cbContainer.style.margin="10px 0 20px 0";
    const checkbox=document.createElement("input"); 
    checkbox.type="checkbox"; 
    checkbox.id="voidcaptcha-checkbox"; 
    checkbox.style.width="24px"; checkbox.style.height="24px"; checkbox.style.cursor="pointer";
    const label=document.createElement("label"); 
    label.style.color="#eee"; label.style.cursor="pointer"; label.style.marginLeft="8px"; 
    label.innerText="I'm not a robot";
    cbContainer.appendChild(checkbox); cbContainer.appendChild(label);

    // links (real ones)
    const links=document.createElement("div"); 
    links.style.fontSize="12px"; links.style.color="#aaa"; links.style.marginTop="8px";
    links.innerHTML=`<a href="https://voidisopen.github.io/voidCAPTCHA/privacy.html" target="_blank" style="color:#aaa;text-decoration:none;">Privacy Policy</a> | <a href="https://voidisopen.github.io/voidCAPTCHA/tos.html" target="_blank" style="color:#aaa;text-decoration:none;">Terms of Service</a>`;

    // instruction & result
    const instruction=document.createElement("p"); 
    instruction.style.margin="10px 0 12px 0"; 
    instruction.style.color="#cfcfcf"; instruction.style.fontSize="14px";
    const result=document.createElement("div"); 
    result.style.fontWeight="700"; result.style.minHeight="20px"; result.style.marginTop="10px";

    // box container (hidden until checkbox checked)
    const boxesWrap=document.createElement("div"); 
    boxesWrap.style.margin="6px 0 8px 0"; boxesWrap.style.display="none"; boxesWrap.style.justifyContent="center";

    card.appendChild(title); 
    card.appendChild(cbContainer); 
    card.appendChild(instruction); 
    card.appendChild(boxesWrap); 
    card.appendChild(result); 
    card.appendChild(links);
    overlay.appendChild(card); 
    document.body.appendChild(overlay);

    // create box
    function makeBox(color){
      const el=document.createElement("div"); el.dataset.color=color;
      el.style.cssText=`
        display:inline-block;width:120px;height:120px;margin:8px;cursor:pointer;
        border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.45);
        background:${color};transition: transform .12s ease, filter .12s ease;
      `;
      el.addEventListener("mouseover",()=>el.style.transform="translateY(-3px)");
      el.addEventListener("mouseout",()=>el.style.transform="translateY(0px)");
      boxesWrap.appendChild(el);
      el.addEventListener("click",(e)=>onBoxClick(e,el,result));
      return el;
    }

    const redBox=makeBox("red"), blueBox=makeBox("blue");

    function setTarget(){ 
      target=COLORS[Math.floor(Math.random()*COLORS.length)]; 
      instruction.innerText=`Click the ${target} box`; 
    }

    function setCooldown(){
      blockedUntil=Date.now()+cooldown;
      cooldown=Math.min(cooldown*2,3600000); // max 1 hour
      if(cooldown>=3600000) result.innerText="⏳ Maximum wait reached! Next fail = infinite wait";
      redBox.style.pointerEvents="none"; blueBox.style.pointerEvents="none";
      clearInterval(countdownTimer);
      countdownTimer=setInterval(()=>{
        const left=Math.max(0,Math.ceil((blockedUntil-Date.now())/1000));
        result.innerText=`⏳ Wait ${left}s before trying again...`;
        if(left<=0){
          clearInterval(countdownTimer); countdownTimer=null; tries=0;
          redBox.style.pointerEvents="auto"; blueBox.style.pointerEvents="auto"; result.innerText="";
          setTarget();
        }
      },300);
    }

    function failAttempt(msg){
      tries++;
      if(msg) result.innerText=msg;
      if(tries>=2){
        if(cooldown>=3600000){ // infinite wait
          blockedUntil=1e20; 
          result.innerText="⏳ Infinite wait! You failed too many times.";
        }else setCooldown();
      }else setTimeout(()=>{result.innerText=""; setTarget();},350);
    }

    function pass(){
      verified=true;
      overlay.style.transition="opacity .36s ease"; overlay.style.opacity="0";
      setTimeout(()=>{if(overlay.parentNode) overlay.parentNode.removeChild(overlay);},380);
      checkbox.checked=true; checkbox.disabled=true;
    }

    function onBoxClick(e,el,result){
      if(Date.now()<blockedUntil){ result.innerText="⏳ Still cooling down..."; return; }

      const rect=el.getBoundingClientRect();
      const clickX=e.clientX-rect.left, clickY=e.clientY-rect.top;
      const forbiddenX=(rect.width/100)*BASE_TINY+1;
      const forbiddenY=(rect.height/100)*BASE_TINY+1;

      if(el.dataset.color===target){
        if(Math.abs(clickX-rect.width/2)<=forbiddenX && Math.abs(clickY-rect.height/2)<=forbiddenY){
          pass();
        }else{
          failAttempt("❌ Wrong spot! Try again.");
        }
      }else{
        failAttempt("❌ Wrong color! Try again.");
      }
    }

    // checkbox logic
    checkbox.addEventListener("change",()=>{
      if(verified){ checkbox.checked=true; checkbox.disabled=true; return; }
      if(checkbox.checked){ boxesWrap.style.display="flex"; setTarget(); }
    });
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",createOverlay);
  else createOverlay();
})();
