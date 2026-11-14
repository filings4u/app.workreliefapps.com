import{createClient}from'https://esm.sh/@supabase/supabase-js@2';
const sb=createClient('https://cqzwoskpgefacghdnuyz.supabase.co','sb_publishable_CoIoX7Pinqd2o4kJwqCTqA_RKmePPZt');
const $=id=>document.getElementById(id),token=new URLSearchParams(location.search).get('ticket')||'';
const next='app/tms-accept-invitation.html?ticket='+encodeURIComponent(token);
$('inviteLoginLink').href='login.html?next='+encodeURIComponent(next);
function message(text,error=false){$('inviteState').textContent=text;$('inviteState').style.color=error?'#a82d49':'#607897'}
let running=false;
async function activate(){if(running)return;
 if(!/^[0-9a-f]{64}$/i.test(token)){message('Invalid invitation link. Request a new invitation from your administrator.',true);return}
 running=true;message('Verifying your signed-in account and invitation…');
 try{
 const{data:{user},error}=await sb.auth.getUser();
 if(error||!user){message('Sign in with the confirmed email address that received this invitation.');return}
 const {data,error:acceptError}=await sb.rpc('tms_accept_external_invite',{p_token:token});
 if(acceptError)throw acceptError;
 if(data?.status!=='accepted')throw Error('Invitation was not accepted');
 const destination=data.kind==='driver'?'tms-driver-workspace.html':'tms-partner-shipments.html';
 message('Your restricted WorkRelief account access is active. Opening your workspace…');
 location.replace(destination);
 }catch(error){message('Unable to accept this invitation: '+(error.message||'Contact your administrator.'),true)}
 finally{running=false}
}
$('inviteTryAgain').onclick=activate;
$('inviteSwitchAccount').onclick=async()=>{await sb.auth.signOut();location.href=$('inviteLoginLink').href};
activate();