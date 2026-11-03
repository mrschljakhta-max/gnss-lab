(function(){
  function setup(){
    const button=document.getElementById('toolsFab');
    const menu=document.getElementById('toolsPopover');
    const close=document.getElementById('toolsPopoverClose');
    if(!button||!menu||!close)return;
    const opened=()=>menu.classList.contains('open');
    const setOpen=(value)=>{
      menu.classList.toggle('open',value);
      menu.setAttribute('aria-hidden',String(!value));
      button.setAttribute('aria-expanded',String(value));
    };
    button.addEventListener('click',()=>setOpen(!opened()));
    close.addEventListener('click',()=>setOpen(false));
    menu.querySelectorAll('[data-tool]').forEach(item=>item.addEventListener('click',()=>setOpen(false)));
    document.addEventListener('pointerdown',event=>{
      if(opened()&&!menu.contains(event.target)&&!button.contains(event.target))setOpen(false);
    });
    document.addEventListener('keydown',event=>{
      if(event.target instanceof HTMLElement&&['INPUT','SELECT','TEXTAREA'].includes(event.target.tagName))return;
      if(event.key==='Escape'&&opened())setOpen(false);
      if(event.key.toLowerCase()==='t'&&!event.ctrlKey&&!event.altKey&&!event.metaKey){
        event.preventDefault();setOpen(!opened());
      }
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
})();