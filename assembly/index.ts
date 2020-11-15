// The entry file of your WebAssembly module.

export function add(a: i32, b: i32): i32 {
  return a + b;
}

export function main(threadID: u32, managedMemory: usize): usize {
  let ptr: usize = load<usize>(managedMemory+threadID*8);
  store<u32>(ptr, threadID);
  return ptr;
}
