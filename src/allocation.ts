export const GODS = [
  ['Odin','Allfather'],['Thor','Thunder'],['Freyja','Love & War'],['Freyr','Harvest'],['Loki','Trickster'],['Tyr','Justice'],['Heimdall','Watchman'],['Frigg','Foresight'],['Baldr','Light'],['Idunn','Renewal'],['Sif','Golden Fields'],['Skadi','Winter'],['Njord','Sea'],['Hel','Underworld'],['Bragi','Poetry'],['Vidar','Vengeance'],['Vali','Rebirth'],['Ullr','The Hunt'],['Forseti','Reconciliation'],['Eir','Healing'],['Gefjun','Abundance'],['Ran','Deep Waters'],['Aegir','Ocean'],['Sol','Sun']
] as const;
export const PS_IDS = ['PS-01','PS-02','PS-03'] as const;
export type PsId = typeof PS_IDS[number];
export type Team = { id:string; name:string; god:string; epithet:string; readyAt:number|null; allocation: {ps:PsId; seat:number; order:number}|null };
export type Event = { id:string; text:string; at:number };
export type State = { teams:Team[]; queue:string[]; events:Event[]; nextOrder:number };
export function initialState(names?:string[]):State {
  return {teams:GODS.map(([god,epithet],i)=>({id:`team-${String(i+1).padStart(2,'0')}`,name:names?.[i]?.trim()||`TEAM ${String(i+1).padStart(2,'0')}`,god,epithet,readyAt:null,allocation:null})),queue:[],events:[],nextOrder:1};
}
export function resetCouncil(state:State):State {
  return {teams:state.teams.map(team=>({...team,readyAt:null,allocation:null})),queue:[],events:[],nextOrder:1};
}
export function capacity(state:State, ps:PsId) { return state.teams.filter(t=>t.allocation?.ps===ps).length; }
export function allocate(state:State, teamId:string, ps:PsId, seat?:number):{state:State;error?:string} {
  const team=state.teams.find(t=>t.id===teamId);
  if(!team) return {state,error:'Team not found.'};
  if(team.allocation) return {state,error:'This team already has a seat. Reassign it from its occupied seat.'};
  const taken=state.teams.filter(t=>t.allocation?.ps===ps).map(t=>t.allocation!.seat);
  if(taken.length>=8) return {state,error:`${ps} is full. Choose a realm with an open seat.`};
  const target=seat??Array.from({length:8},(_,i)=>i+1).find(n=>!taken.includes(n));
  if(!target||target<1||target>8||taken.includes(target)) return {state,error:'That seat is unavailable. Choose an empty seat.'};
  const updated={...team,allocation:{ps,seat:target,order:state.nextOrder},readyAt:null};
  return {state:{...state,teams:state.teams.map(t=>t.id===teamId?updated:t),queue:state.queue.filter(id=>id!==teamId),nextOrder:state.nextOrder+1,events:[{id:crypto.randomUUID(),text:`${team.name} (${team.god}) seated at ${ps}, seat ${target}.`,at:Date.now()},...state.events].slice(0,80)}};
}
export function markReady(state:State,teamId:string):State {
  const team=state.teams.find(t=>t.id===teamId); if(!team||team.allocation||team.readyAt!==null)return state;
  const stamp=Date.now(); return {...state,teams:state.teams.map(t=>t.id===teamId?{...t,readyAt:stamp}:t),queue:[...state.queue,teamId],events:[{id:crypto.randomUUID(),text:`${team.name} raised a hand · queue position ${state.queue.length+1}.`,at:stamp},...state.events].slice(0,80)};
}
export function removeReady(state:State,teamId:string):State { return {...state,queue:state.queue.filter(id=>id!==teamId),teams:state.teams.map(t=>t.id===teamId?{...t,readyAt:null}:t)}; }
export function reassign(state:State,teamId:string,ps:PsId,seat?:number):{state:State;error?:string} {
  const team=state.teams.find(t=>t.id===teamId); if(!team?.allocation)return {state,error:'Choose an allocated team to move.'};
  const cleared={...state,teams:state.teams.map(t=>t.id===teamId?{...t,allocation:null}:t)};
  const result=allocate(cleared,teamId,ps,seat); if(result.error)return {state,error:result.error};
  const nextTeam=result.state.teams.find(t=>t.id===teamId)!;
  return {...result,state:{...result.state,teams:result.state.teams.map(t=>t.id===teamId?{...t,allocation:{...nextTeam.allocation!,order:team.allocation!.order}}:t),events:[{id:crypto.randomUUID(),text:`${team.name} reassigned from ${team.allocation.ps} to ${ps}.`,at:Date.now()},...state.events].slice(0,80)}};
}
export function undo(state:State,history:State[]):{state:State;history:State[]} { return history.length?{state:history[history.length-1],history:history.slice(0,-1)}:{state,history}; }
