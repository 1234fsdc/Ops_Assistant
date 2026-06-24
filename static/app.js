class SuperBizAgentApp {
    constructor() { this.apiBase = 'http://localhost:9900/api'; this.mode = 'quick'; this.sid = this.genSid(); this.streaming = false; this.hist = []; this.allHist = this.loadHist(); this.fromHist = false; this.init(); }
    init(){this.initEl();this.bindEv();let ch=()=>{if(typeof marked!=='undefined'){marked.setOptions({breaks:true,gfm:true,headerIds:false,mangle:false});if(typeof hljs!=='undefined')marked.setOptions({highlight:(c,l)=>l&&hljs.getLanguage(l)?hljs.highlight(c,{language:l}).value:c});}else setTimeout(ch,100);};ch();}
    renderMd(c){if(!c)return'';if(typeof marked==='undefined')return this.esc(c);try{return marked.parse(c);}catch(e){return this.esc(c);}}
    hlCode(c){if(typeof hljs!=='undefined'&&c)c.querySelectorAll('pre code').forEach(b=>{if(!b.classList.contains('hljs'))hljs.highlightElement(b);});}
    esc(t){let d=document.createElement('div');d.textContent=t;return d.innerHTML;}
    genSid(){return 's_'+Math.random().toString(36).substr(2,9)+'_'+Date.now();}
    initEl(){this.mInput=document.getElementById('messageInput');this.sBtn=document.getElementById('sendButton');this.uBtn=document.getElementById('uploadBtn');this.fInput=document.getElementById('fileInput');this.mQ=document.getElementById('modeQuick');this.mS=document.getElementById('modeStream');this.cMsg=document.getElementById('chatMessages');this.wGreet=document.getElementById('welcomeGreeting');this.cHist=document.getElementById('chatHistoryList');this.hToggle=document.getElementById('historyToggleBtn');this.hDrawer=document.getElementById('historyDrawer');this.dOverlay=document.getElementById('drawerOverlay');this.dClose=document.getElementById('drawerCloseBtn');this.nChatBtn=document.getElementById('newChatBtn');this.aOpsBtn=document.getElementById('aiOpsHeaderBtn');this.modeGroup=document.querySelector('.header-mode-group');}
    bindEv(){if(this.hToggle)this.hToggle.addEventListener('click',()=>this.toggleDrawer());if(this.dClose)this.dClose.addEventListener('click',()=>this.closeDrawer());if(this.nChatBtn)this.nChatBtn.addEventListener('click',()=>this.newChat());if(this.dOverlay)this.dOverlay.addEventListener('click',()=>this.closeDrawer());if(this.aOpsBtn)this.aOpsBtn.addEventListener('click',()=>this.runAIOps());if(this.mQ)this.mQ.addEventListener('click',()=>this.setMode('quick'));if(this.mS)this.mS.addEventListener('click',()=>this.setMode('stream'));if(this.sBtn)this.sBtn.addEventListener('click',()=>this.sendMsg());if(this.mInput){this.mInput.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();this.sendMsg();}});}if(this.uBtn)this.uBtn.addEventListener('click',()=>{if(this.fInput)this.fInput.click();});if(this.fInput)this.fInput.addEventListener('change',e=>this.onFileSel(e));}
    toggleDrawer(){if(this.hDrawer&&this.dOverlay){this.hDrawer.classList.toggle('open');this.dOverlay.classList.toggle('open');}}
    closeDrawer(){if(this.hDrawer&&this.dOverlay){this.hDrawer.classList.remove('open');this.dOverlay.classList.remove('open');}}
    setMode(m){if(!this.streaming){this.mode=m;this.updateUI();}}
    updateUI(){if(this.mQ)this.mQ.classList.toggle('active',this.mode==='quick');if(this.mS)this.mS.classList.toggle('active',this.mode==='stream');if(this.sBtn)this.sBtn.disabled=this.streaming;}
    newChat(){if(this.streaming)return;if(this.hist.length>0){if(this.fromHist)this.updateHist();else this.saveHist();}this.streaming=false;this.hist=[];this.fromHist=false;if(this.cMsg)this.cMsg.innerHTML='';this.sid=this.genSid();this.showGreet();this.closeDrawer();this.renderHist();this.updateUI();}
    showGreet(){let wg=document.getElementById('welcomeGreeting');if(wg)wg.classList.remove('hidden');}
    hideGreet(){let wg=document.getElementById('welcomeGreeting');if(wg)wg.classList.add('hidden');}
    saveHist(){if(!this.hist.length)return;let fi=this.hist.find(m=>m.type==='user');let t=fi?fi.content.substring(0,30)+(fi.content.length>30?'...':''):'新对话';this.allHist.unshift({id:this.sid,title:t,messages:[...this.hist],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});if(this.allHist.length>50)this.allHist=this.allHist.slice(0,50);this.saveToStorage();}
    updateHist(){if(!this.hist.length)return;let i=this.allHist.findIndex(h=>h.id===this.sid);if(i<0){this.saveHist();return;}let h=this.allHist[i];h.messages=[...this.hist];h.updatedAt=new Date().toISOString();this.saveToStorage();}
    loadHist(){try{return JSON.parse(localStorage.getItem('chatHistories'))||[];}catch(e){return[];}}
    saveToStorage(){try{localStorage.setItem('chatHistories',JSON.stringify(this.allHist));}catch(e){}}
    renderHist(){if(!this.cHist)return;this.cHist.innerHTML='';for(let h of this.allHist){let item=document.createElement('div');item.className='history-item'+(h.id===this.sid?' active':'');item.innerHTML='<span>'+this.esc(h.title)+'</span>';item.addEventListener('click',()=>{this.closeDrawer();this.loadHistById(h.id);});this.cHist.appendChild(item);}}
    async loadHistById(id){let h=this.allHist.find(x=>x.id===id);if(!h)return;this.sid=h.id;this.fromHist=true;this.hist=[...h.messages];this.cMsg.innerHTML='';for(let m of h.messages)this.addMsg(m.type,m.content,false,false);this.renderHist();}
    delHist(id){this.allHist=this.allHist.filter(x=>x.id!==id);this.saveToStorage();this.renderHist();if(this.sid===id){this.hist=[];if(this.cMsg)this.cMsg.innerHTML='';this.sid=this.genSid();this.showGreet();}}
    async sendMsg(){let msg=this.mInput?this.mInput.value.trim():'';if(!msg||this.streaming)return;this.addMsg('user',msg);if(this.mInput){this.mInput.value='';}this.streaming=true;this.updateUI();try{if(this.mode==='quick')await this.qMsg(msg);else await this.sMsg(msg);}catch(e){this.addMsg('assistant','抱歉，发送消息时出现错误：'+e.message);}finally{this.streaming=false;this.updateUI();if(this.fromHist&&this.hist.length){this.updateHist();this.renderHist();}}}
    async qMsg(msg){let ld=this.addLoading('正在思考...');try{let r=await fetch(this.apiBase+'/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({Id:this.sid,Question:msg})});if(!r.ok)throw new Error('HTTP '+r.status);let d=await r.json();if(ld&&ld.parentNode)ld.remove();if((d.code===200||d.message==='success')&&d.data&&d.data.success)this.addMsg('assistant',d.data.answer||'');else if(d.data&&d.data.errorMessage)throw new Error(d.data.errorMessage);else throw new Error(d.message||'请求失败');}catch(e){if(ld&&ld.parentNode)ld.remove();throw e;}}
    async sMsg(msg){let r=await fetch(this.apiBase+'/chat_stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({Id:this.sid,Question:msg})});if(!r.ok)throw new Error('HTTP '+r.status);let el=this.addMsg('assistant','',true),full='',reader=r.body.getReader(),dec=new TextDecoder(),buf='';try{while(true){let{done,value}=await reader.read();if(done){this.endStream(el,full);break;}buf+=dec.decode(value,{stream:true});let ls=buf.split('\n');buf=ls.pop()||'';for(let line of ls){if(!line.trim()||line.startsWith('id:')||line.startsWith('event:'))continue;if(line.startsWith('data:')){let raw=line.substring(5).trim();if(raw==='[DONE]'){this.endStream(el,full);return;}try{let sse=JSON.parse(raw);if(sse.type==='content'){full+=sse.data||'';this.upStream(el,full);}else if(sse.type==='done'){this.endStream(el,full);return;}else if(sse.type==='error')throw new Error(sse.data);}catch(e){if(e.message&&e.message.includes('error'))throw e;}}}}}finally{reader.releaseLock();}}
    upStream(el,ct){if(!el)return;let mc=el.querySelector('.message-content');if(mc){mc.innerHTML=this.renderMd(ct);this.hlCode(mc);}}
    endStream(el,r){if(el){el.classList.remove('streaming');let mc=el.querySelector('.message-content');if(mc){mc.innerHTML=this.renderMd(r);this.hlCode(mc);}}if(r){this.hist.push({type:'assistant',content:r,timestamp:new Date().toISOString()});if(this.fromHist){this.updateHist();this.renderHist();}}}
    addMsg(type,content,isStream,save){let first=this.cMsg&&!this.cMsg.querySelector('.message');if(first)this.hideGreet();if(!isStream&&save!==false&&content)this.hist.push({type,content,timestamp:new Date().toISOString()});let div=document.createElement('div');div.className='message '+type+(isStream?' streaming':'');let av=document.createElement('div');av.className='message-avatar';av.innerHTML='<svg width=18 height=18 viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/></svg>';div.appendChild(av);let w=document.createElement('div');w.className='message-content-wrapper';let mc=document.createElement('div');mc.className='message-content';if(type==='assistant'&&!isStream&&content){mc.innerHTML=this.renderMd(content);this.hlCode(mc);}else if(content)mc.textContent=content;w.appendChild(mc);div.appendChild(w);if(this.cMsg){this.cMsg.appendChild(div);this.scrollBot();}return div;}
    addLoading(content){let div=document.createElement('div');div.className='message assistant';let av=document.createElement('div');av.className='message-avatar';av.innerHTML='<svg width=18 height=18 viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/></svg>';div.appendChild(av);let w=document.createElement('div');w.className='message-content-wrapper';let mc=document.createElement('div');mc.className='message-content loading-message-content';mc.innerHTML='<span>'+this.esc(content)+'</span><span class="loading-spinner-icon">⏳</span>';w.appendChild(mc);div.appendChild(w);if(this.cMsg){if(!this.cMsg.querySelector('.message'))this.hideGreet();this.cMsg.appendChild(div);this.scrollBot();}return div;}
    scrollBot(){if(this.cMsg)this.cMsg.scrollTop=this.cMsg.scrollHeight;}
    showNotif(msg,type){let n=document.createElement('div');n.className='notification';n.textContent=msg;let c={info:'#4f6bff',success:'#34a853',warning:'#fbbc04',error:'#ea4335'};n.style.background=c[type]||c.info;document.body.appendChild(n);setTimeout(()=>{n.style.opacity='0';n.style.transition='opacity 0.3s';setTimeout(()=>n.remove(),300);},3000);}
    onFileSel(e){let f=e.target.files[0];if(!f)return;if(!f.name.toLowerCase().match(/\.(txt|md|markdown)$/)){this.showNotif('只支持TXT或.md文件','error');this.fInput.value='';return;}this.uploadFile(f);}
    async uploadFile(f){if(f.size>50*1024*1024){this.showNotif('文件不能超过50MB','error');return;}this.streaming=true;this.updateUI();try{let fd=new FormData();fd.append('file',f);let r=await fetch(this.apiBase+'/upload',{method:'POST',body:fd});if(!r.ok)throw new Error('HTTP '+r.status);let d=await r.json();if((d.code===200||d.message==='success')&&d.data)this.addMsg('assistant',f.name+' 上传成功');else throw new Error(d.message);}catch(e){this.showNotif('上传失败: '+e.message,'error');}finally{if(this.fInput)this.fInput.value='';this.streaming=false;this.updateUI();}}
    async runAIOps(){
        if(this.streaming)return;
        if(this.modeGroup)this.modeGroup.style.display='none';
        this.newChat();
        let el=this.addLoading('分析中...');
        this.streaming=true; this.updateUI();
        try{
            let r=await fetch(this.apiBase+'/aiops',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:this.sid})});
            if(!r.ok)throw new Error('HTTP '+r.status);
            let full='',reader=r.body.getReader(),dec=new TextDecoder(),buf='';
            while(true){
                let{done,value}=await reader.read();
                if(done)break;
                buf+=dec.decode(value,{stream:true});
                let ls=buf.split('\n');
                buf=ls.pop()||'';
                for(let line of ls){
                    if(!line.trim()||line.startsWith('id:')||line.startsWith('event:'))continue;
                    if(line.startsWith('data:')){
                        try{
                            let m=JSON.parse(line.substring(5).trim());
                            if(m.type==='content'){full+=m.data||'';if(el){let mc=el.querySelector('.message-content');mc.innerHTML=this.renderMd(full);this.hlCode(mc);}}
                            else if(m.type==='plan'){let ps=(m.plan||[]).map((s,i)=>'\n**步骤'+(i+1)+':** '+s).join('');full+='\n\n## ☑️ 诊断计划\n'+ps+'\n\n';if(el){let mc=el.querySelector('.message-content');mc.innerHTML=this.renderMd(full);this.hlCode(mc);}}
                            else if(m.type==='step_complete'){full+='\n✅ '+(m.current_step||'')+' — '+(m.result_preview||'').substring(0,80)+'\n';if(el){let mc=el.querySelector('.message-content');mc.innerHTML=this.renderMd(full);this.hlCode(mc);}}
                            else if(m.type==='status'){full+='\n⏳ '+(m.message||'')+'\n';if(el){let mc=el.querySelector('.message-content');mc.innerHTML=this.renderMd(full);this.hlCode(mc);}}
                            else if(m.type==='report'){full+='\n## 🎯 诊断报告\n'+(m.report||m.message||'')+'\n';if(el){let mc=el.querySelector('.message-content');mc.innerHTML=this.renderMd(full);this.hlCode(mc);}}
                            else if(m.type==='complete'||m.type==='done'){if(m.response)full=m.response;full=full||'诊断完成';break;}
                        }catch(e){}
                    }
                }
            }
        }catch(e){if(el){let mc=el.querySelector('.message-content');if(mc)mc.textContent='诊断失败: '+e.message;}}
        finally{
            if(typeof reader!=='undefined'&&reader)reader.releaseLock();
            if(el){el.classList.remove('streaming');let mc=el.querySelector('.message-content');if(mc){mc.innerHTML=this.renderMd(full);this.hlCode(mc);}}
            this.hist.push({type:'assistant',content:full||'',timestamp:new Date().toISOString()});
            this.streaming=false; this.updateUI();
            if(this.modeGroup)this.modeGroup.style.display='';
        }
    }
}

document.addEventListener('DOMContentLoaded',()=>new SuperBizAgentApp());
