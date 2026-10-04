function () {
  return new Promise(function(resolve){
    var output={scope:'Current WEAPP native image uploaded from an existing owned publication file; copy/readback capability, not phone acceptance',available:false,pixelsEqual:false,resourcesReleased:false};
    var gl,image,canvas,textures=[],framebuffers=[],finished=false;
    var timer=setTimeout(function(){output.reason='bounded_native_image_timeout';finish();},5000);
    function finish(){if(finished)return;finished=true;clearTimeout(timer);if(image){image.onload=null;image.onerror=null;image=null;}if(gl){gl.bindFramebuffer(gl.FRAMEBUFFER,null);framebuffers.forEach(function(v){if(v)gl.deleteFramebuffer(v);});textures.forEach(function(v){if(v)gl.deleteTexture(v);});output.resourcesReleased=true;output.releaseError=gl.getError();}canvas=null;resolve(output);}
    try {
      var fs=wx.getFileSystemManager(),root=wx.env.USER_DATA_PATH;
      fs.readdir({dirPath:root,success:function(list){try{
        var files=list.files.filter(function(name){return /^sky-art-[a-z0-9_]+-[1-9]\d*\.jpg$/.test(name)&&fs.statSync(root+'/'+name).size===__EXPECTED_ENCODED_BYTES__;});
        output.matchingEncodedFiles=files.length;
        if(files.length!==1){output.reason='owned_publication_file_not_unique';finish();return;}
        canvas=wx.createOffscreenCanvas({type:'webgl',width:16,height:8});
        if(typeof canvas.createImage!=='function'){output.reason='offscreen_native_image_unavailable';finish();return;}
        gl=canvas.getContext('webgl');image=canvas.createImage();
        image.onerror=function(){output.reason='native_image_decode_failed';finish();};
        image.onload=function(){try{
          if(image.width!==2048||image.height!==1024)throw new Error('publication_dimensions_mismatch');
          output.available=true;output.imageWidth=image.width;output.imageHeight=image.height;
          var source=gl.createTexture();textures.push(source);gl.bindTexture(gl.TEXTURE_2D,source);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
          gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);output.uploadError=gl.getError();
          var input=gl.createFramebuffer();framebuffers.push(input);gl.bindFramebuffer(gl.FRAMEBUFFER,input);
          gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,source,0);
          output.sourceComplete=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
          var expected=new Uint8Array(256*128*4);gl.readPixels(896,384,256,128,gl.RGBA,gl.UNSIGNED_BYTE,expected);output.sourceReadError=gl.getError();
          var crop=gl.createTexture();textures.push(crop);gl.bindTexture(gl.TEXTURE_2D,crop);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
          gl.copyTexImage2D(gl.TEXTURE_2D,0,gl.RGBA,896,384,256,128,0);output.copyError=gl.getError();
          var destination=gl.createFramebuffer();framebuffers.push(destination);gl.bindFramebuffer(gl.FRAMEBUFFER,destination);
          gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,crop,0);
          output.cropComplete=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
          var actual=new Uint8Array(expected.length);gl.readPixels(0,0,256,128,gl.RGBA,gl.UNSIGNED_BYTE,actual);output.cropReadError=gl.getError();
          var equal=true,nonzero=0;for(var i=0;i<actual.length;i++){if(actual[i]!==expected[i])equal=false;if(i%4!==3&&expected[i]!==0)nonzero++;}
          output.pixelsEqual=equal;output.nonzeroColourChannels=nonzero;output.comparedChannels=actual.length;
          output.sourceRgbaBytes=image.width*image.height*4;output.cropRgbaBytes=actual.length;
        }catch(error){output.reason=String(error).slice(0,250);}finish();};
        image.src=root+'/'+files[0];
      }catch(error){output.reason=String(error).slice(0,250);finish();}},fail:function(){output.reason='owned_file_listing_unavailable';finish();}});
    }catch(error){output.reason=String(error).slice(0,250);finish();}
  });
}
