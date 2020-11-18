// The entry file of your WebAssembly module.

export function add(a: i32, b: i32): i32 {
  return a + b;
}

declare namespace threadInfo {
  function id(): u32;
}

export function main(managedMemory: usize): usize {
  let tip: u32 = threadInfo.id();
  let ptr: usize = load<usize>(managedMemory+tip*8);
  store<u32>(ptr, tip);
  return ptr;
}
