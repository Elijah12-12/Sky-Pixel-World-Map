// Run in the browser console after the map loads, then copy/download the result.
(function(){
 const data=window.SkyPixelAtlasDB?.exportRuntimeDatabase?.();
 if(!data){console.error('Atlas database tools are not loaded.');return;}
 const text=JSON.stringify(data,null,2);
 const blob=new Blob([text],{type:'application/json'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='atlas-runtime-export.json';a.click();URL.revokeObjectURL(a.href);
 console.log('Exported Atlas runtime database audit.',data);
})();