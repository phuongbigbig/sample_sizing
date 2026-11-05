import * as S from "../src/stats.js";
const eq=(name,got,exp)=>{const ok=got===exp;console.log((ok?"PASS":"FAIL"),name,got,ok?"":"expected "+exp);if(!ok)process.exitCode=1;};
// statsmodels references
[[0.8,.8,26],[0.5,.8,64],[0.2,.8,394],[0.8,.9,34],[0.5,.9,86],[0.2,.9,527]].forEach(([d,p,e])=>eq(`t-ind d=${d} pw=${p}`,S.nTwoGroup(d,p),e));
[[0.8,.8,15],[0.5,.8,34],[0.2,.8,199],[0.8,.9,19],[0.5,.9,44],[0.2,.9,265]].forEach(([d,p,e])=>eq(`paired dz=${d} pw=${p}`,S.nPaired(d,p),e));
[[0.5,.8,66],[0.67,.8,196],[0.8,.8,631],[0.5,.9,88],[0.67,.9,263],[0.8,.9,845]].forEach(([h,p,e])=>eq(`schoenfeld HR=${h} pw=${p}`,S.eventsSchoenfeld(h,p),e));
// RNASeqPower documented example: depth 10, cv .5, FC 1.5 -> 33.4 / 49.7 / 72.7 ; FC2 a.05 -> 11.4
eq("hart a.05",S.nHart(10,.5,1.5,.8,.05),34);eq("hart a.01",S.nHart(10,.5,1.5,.8,.01),50);eq("hart a.001",S.nHart(10,.5,1.5,.8,.001),73);eq("hart FC2",S.nHart(10,.5,2,.8,.05),12);
eq("gwas qt 1%",S.nGwasQuant(.01,.8),3921);eq("gwas qt 5%",S.nGwasQuant(.05,.8),753);
eq("gwas cc OR1.5 maf.3",S.nGwasCC(.3,1.5,.8),1074);eq("gwas cc OR2 maf.05",S.nGwasCC(.05,2,.8),1302);
eq("allele 5%",S.nAlleleDetect(.05),30);eq("allele 1%",S.nAlleleDetect(.01),150);
// scRNA cells: P(Pois(n*.02)>=50)>=.95 -> check by brute force
const n=S.nCellsForType(.02,50);const pa=(l,k)=>{let t=Math.exp(-l),c=t;for(let i=1;i<k;i++){t*=l/i;c+=t}return 1-c};
eq("cells minimal",pa(n*.02,50)>=.95&&pa((n-1)*.02,50)<.95,true);console.log("cells for 2% type, 50 cells:",n);
