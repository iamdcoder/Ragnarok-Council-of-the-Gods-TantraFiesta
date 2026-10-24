import { describe,it,expect } from 'vitest';
import { allocate,capacity,initialState,markReady,PS_IDS,reassign,resetCouncil,undo } from './allocation';
describe('council allocation rules',()=>{
	 it('starts with 23 unique identities and 8 open seats per realm',()=>{const s=initialState();expect(s.teams).toHaveLength(23);expect(new Set(s.teams.map(t=>t.god)).size).toBe(23);PS_IDS.forEach(ps=>expect(capacity(s,ps)).toBe(0));});
 it('allocates the first open seat and removes the team from the FIFO queue',()=>{let s=markReady(initialState(),'team-01');expect(s.queue).toEqual(['team-01']);const r=allocate(s,'team-01','PS-01');expect(r.state.teams[0].allocation?.seat).toBe(1);expect(r.state.queue).toEqual([]);});
 it('rejects ninth allocation without changing state',()=>{let s=initialState();for(let i=1;i<=8;i++)s=allocate(s,`team-${String(i).padStart(2,'0')}`,'PS-01').state;const r=allocate(s,'team-09','PS-01');expect(r.error).toBeTruthy();expect(r.state).toBe(s);expect(capacity(s,'PS-01')).toBe(8);});
 it('undo restores the previous snapshot',()=>{const s=initialState();const r=allocate(s,'team-01','PS-02');const u=undo(r.state,[s]);expect(u.state.teams[0].allocation).toBeNull();});
 it('preserves hand registration order and supports an explicit seat',()=>{let s=initialState();s=markReady(s,'team-12');s=markReady(s,'team-02');s=markReady(s,'team-07');expect(s.queue).toEqual(['team-12','team-02','team-07']);const r=allocate(s,'team-12','PS-03',6);expect(r.state.teams[11].allocation).toMatchObject({ps:'PS-03',seat:6});expect(r.state.queue).toEqual(['team-02','team-07']);});
 it('reassigns atomically and preserves original allocation order',()=>{let s=allocate(initialState(),'team-01','PS-01',4).state;const moved=reassign(s,'team-01','PS-03',8);expect(moved.error).toBeUndefined();expect(capacity(moved.state,'PS-01')).toBe(0);expect(capacity(moved.state,'PS-03')).toBe(1);expect(moved.state.teams[0].allocation).toEqual({ps:'PS-03',seat:8,order:1});});
	it('returns a partially seated and queued council while preserving the roster',()=>{
		let s=initialState();
		s={...s,teams:s.teams.map((team,index)=>index===0?{...team,name:'TEAM FALCON'}:index===2?{...team,name:'TEAM WOLF'}:team)};
		s=markReady(s,'team-01');s=allocate(s,'team-01','PS-01',4).state;
		s=allocate(s,'team-02','PS-01',8).state;
		s=markReady(s,'team-03');s=allocate(s,'team-03','PS-02',6).state;
		s=markReady(s,'team-04');
		expect(capacity(s,'PS-01')).toBe(2);expect(capacity(s,'PS-02')).toBe(1);expect(s.queue).toEqual(['team-04']);
		const roster=s.teams.map(({id,name,god,epithet})=>({id,name,god,epithet}));
		const clean=resetCouncil(s);
		expect(clean.queue).toEqual([]);
		expect(clean.teams.map(({id,name,god,epithet})=>({id,name,god,epithet}))).toEqual(roster);
		expect(clean.teams).toHaveLength(23);
		expect(clean.teams.every(t=>t.allocation===null&&t.readyAt===null)).toBe(true);
		PS_IDS.forEach(ps=>expect(capacity(clean,ps)).toBe(0));expect(clean.nextOrder).toBe(1);expect(clean.events).toEqual([]);
	});
 it('reaches the balanced 8/8/7 final distribution without duplicate seats',()=>{let s=initialState();for(let i=0;i<23;i++){const ps=PS_IDS[Math.floor(i/8)];s=allocate(s,`team-${String(i+1).padStart(2,'0')}`,ps).state}expect(s.teams.filter(t=>t.allocation)).toHaveLength(23);expect(PS_IDS.map(ps=>capacity(s,ps))).toEqual([8,8,7]);expect(new Set(s.teams.map(t=>`${t.allocation?.ps}-${t.allocation?.seat}`)).size).toBe(23);});
});
