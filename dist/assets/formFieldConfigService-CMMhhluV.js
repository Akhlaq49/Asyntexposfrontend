import{a}from"./index-BEzZlHGs.js";const r=async s=>{const e=s?{formName:s}:{};return(await a.get("/formfieldconfigs",{params:e})).data},n=async s=>(await a.put("/formfieldconfigs/bulk",s)).data,i=async()=>(await a.post("/formfieldconfigs/seed")).data;export{n as a,r as g,i as s};
//# sourceMappingURL=formFieldConfigService-CMMhhluV.js.map
