import{createClient}from'https://esm.sh/@supabase/supabase-js@2';
const sb=createClient('https://cqzwoskpgefacghdnuyz.supabase.co','sb_publishable_CoIoX7Pinqd2o4kJwqCTqA_RKmePPZt');
const $=id=>document.getElementById(id),E=(tag,t)=>{const n=document.createElement(tag);if(t!==undefined)n.textContent=String(t);return n};let notices=[],busy=false;
const status=(s,error=false)=>{const n=$('noticeState');n.textContent=s;n.style.color=error?'#aa2a49':'#657d97'};
function render(){
 const host=$('noticeRows');host.replaceChildren();const unreadOnly=$('noticeUnread').checked;
 const visible=notices.filter(n=>!unreadOnly||!n.read_at);
 $('noticeCount').textContent=notices.filter(n=>!n.read_at).length+' unread · '+notices.length+' recent';
 for(const n of visible){const row=E('article');row.className='notice-row'+(!n.read_at?' unread':'');
 const body=E('div');body.append(E('strong',n.title),E('p',n.body),E('small',new Date(n.created_at).toLocaleString()+' · '+(n.read_at?'Read':'Unread')));row.append(body);
 if(!n.read_at){const button=E('button','Mark Read');button.type='button';button.onclick=()=>mark(n,button);row.append(button)}
 host.append(row);
 }
 if(!visible.length)host.append(E('p',unreadOnly?'You have no unread notifications.':'No current notifications for your authorized WorkRelief account.'));
}
async function load(){
 if(busy)return;
 status('Loading role-authorized TMS messages…');
 const {data,error}=await sb.rpc('tms_my_notifications',{p_limit:100});
 if(error){status('Notifications unavailable: '+error.message,true);return}
 notices=Array.isArray(data)?data:[];render();status('Showing recent in-app notifications. No external messages are being sent.');
}
async function mark(n,button){button.disabled=true;const{error}=await sb.rpc('tms_mark_notification_read',{p_notice:n.id});if(error){status('Unable to mark read: '+error.message,true);button.disabled=false;return}n.read_at=new Date().toISOString();render();}
$('noticeUnread').onchange=render;$('noticeRefresh').onclick=load;
(async()=>{const{data:{user},error}=await sb.auth.getUser();if(error||!user){status('Sign in to WorkRelief to see your notifications.',true);return}await load()})();