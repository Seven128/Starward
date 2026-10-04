function () {
  var output = {scope:'Current WEAPP offscreen WebGL API capability; neither production-image path nor phone acceptance',available:false,pixelsEqual:false,copyError:null,resourcesReleased:false};
  var gl, textures = [], framebuffers = [];
  try {
    if (typeof wx.createOffscreenCanvas !== 'function') {output.reason='offscreen_canvas_unavailable';return output;}
    var canvas=wx.createOffscreenCanvas({type:'webgl',width:16,height:8});
    gl=canvas.getContext('webgl');
    if (!gl) {output.reason='offscreen_webgl_unavailable';return output;}
    output.available=true;
    var original=new Uint8Array(16*8*4);
    for(var y=0;y<8;y++)for(var x=0;x<16;x++){var index=(y*16+x)*4;original[index]=x*13;original[index+1]=y*29;original[index+2]=(x+y)*7;original[index+3]=255;}
    var source=gl.createTexture();textures.push(source);gl.bindTexture(gl.TEXTURE_2D,source);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,16,8,0,gl.RGBA,gl.UNSIGNED_BYTE,original);
    var input=gl.createFramebuffer();framebuffers.push(input);gl.bindFramebuffer(gl.FRAMEBUFFER,input);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,source,0);
    output.sourceComplete=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
    var crop=gl.createTexture();textures.push(crop);gl.bindTexture(gl.TEXTURE_2D,crop);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.copyTexImage2D(gl.TEXTURE_2D,0,gl.RGBA,2,3,4,3,0);output.copyError=gl.getError();
    var readback=gl.createFramebuffer();framebuffers.push(readback);gl.bindFramebuffer(gl.FRAMEBUFFER,readback);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,crop,0);
    output.cropComplete=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
    var actual=new Uint8Array(4*3*4);gl.readPixels(0,0,4,3,gl.RGBA,gl.UNSIGNED_BYTE,actual);output.readError=gl.getError();
    var equal=true;for(var cy=0;cy<3;cy++)for(var cx=0;cx<4;cx++)for(var c=0;c<4;c++)if(actual[(cy*4+cx)*4+c]!==original[((cy+3)*16+cx+2)*4+c])equal=false;
    output.pixelsEqual=equal;output.sourceBytes=original.length;output.cropBytes=actual.length;
  } catch(error) {output.reason=String(error).slice(0,250);}
  finally {if(gl){gl.bindFramebuffer(gl.FRAMEBUFFER,null);framebuffers.forEach(function(value){if(value)gl.deleteFramebuffer(value);});textures.forEach(function(value){if(value)gl.deleteTexture(value);});output.resourcesReleased=true;output.releaseError=gl.getError();}}
  return output;
}
