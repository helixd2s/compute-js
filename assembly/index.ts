// The entry file of your WebAssembly module.

export function add(a: i32, b: i32): i32 {
  return a + b;
}

declare namespace threadInfo {
  function id(): u32;
}

export function threaded(tip: u32, managedMemory: usize) {
  let ptr: usize = load<usize>(managedMemory+tip*8);
  store<u32>(ptr, tip);
  return ptr;
}

// executor (in C++ it harder)
export function main(managedMemory: usize): usize {
  threaded(threadInfo.id(), managedMemory);
}
