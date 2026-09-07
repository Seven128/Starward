/* Scripter-specific download UI. Input files are actual exportAsync bytes or
 * actual snapshot JSON. No external service, renderer or browser hidden API. */
async function starwardDownload(files) {
  const output = createWindow({width:420,height:240}, async (self) => {
    const message=await self.recv();
    const encode=s=>new TextEncoder().encode(s);
    const crc=bytes=>{let n=0xffffffff;for(const b of bytes){n^=b;for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0);}return(n^0xffffffff)>>>0;};
    const blocks=[],central=[];let offset=0;
    for(const file of message.files) {
      const name=encode(file.name), bytes=typeof file.data==='string'?encode(file.data):new Uint8Array(file.data), checksum=crc(bytes);
      const header=new Uint8Array(30+name.length), view=new DataView(header.buffer);
      view.setUint32(0,0x04034b50,true);view.setUint16(4,20,true);view.setUint16(6,0x800,true);view.setUint32(14,checksum,true);view.setUint32(18,bytes.length,true);view.setUint32(22,bytes.length,true);view.setUint16(26,name.length,true);header.set(name,30);
      const entry=new Uint8Array(46+name.length), e=new DataView(entry.buffer);
      e.setUint32(0,0x02014b50,true);e.setUint16(4,20,true);e.setUint16(6,20,true);e.setUint16(8,0x800,true);e.setUint32(16,checksum,true);e.setUint32(20,bytes.length,true);e.setUint32(24,bytes.length,true);e.setUint16(28,name.length,true);e.setUint32(42,offset,true);entry.set(name,46);
      blocks.push(header,bytes);central.push(entry);offset+=header.length+bytes.length;
    }
    const size=central.reduce((n,b)=>n+b.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);
    v.setUint32(0,0x06054b50,true);v.setUint16(8,central.length,true);v.setUint16(10,central.length,true);v.setUint32(12,size,true);v.setUint32(16,offset,true);
    const blob=new Blob([...blocks,...central,end],{type:'application/zip'});
    const a=document.createElement('a');a.textContent='下载本轮 Figma 原生导出';a.href=URL.createObjectURL(blob);a.download='starward-figma-export.zip';document.body.appendChild(a);
    const p=document.createElement('p');p.textContent=message.files.length+' 个文件；来源为当前画布的 PNG 和节点快照。';document.body.appendChild(p);
    document.body.style.cssText='font:16px/1.6 system-ui;padding:20px;background:white;color:#222';
  });
  output.send({files:files.map(file=>({name:file.name,data:typeof file.data==='string'?file.data:Array.from(file.data)}))});
  await output;
}
