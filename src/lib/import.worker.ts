import { importRayconfig } from './raycast';
self.onmessage = async (event: MessageEvent<{bytes:Uint8Array;password:string;name:string}>) => {
  try { const {bytes,password,name}=event.data;const keymap=await importRayconfig(bytes,password,name);self.postMessage({keymap}); }
  catch(error) { self.postMessage({error:error instanceof Error?error.message:'Import failed.'}); }
};
