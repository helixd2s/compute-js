(module
  (type (;0;) (func (param i32 i32) (result i32)))
  (type (;1;) (func))
  (import "env" "memory" (memory (;0;) 256 256 shared))
  (func (;0;) (type 1)
    nop)
  (func (;1;) (type 0) (param i32 i32) (result i32)
    (local i32)
    i32.const 5243904
    local.tee 2
    local.get 0
    i32.store offset=12
    local.get 2
    local.get 1
    i32.atomic.rmw.add offset=12)
  (func (;2;) (type 0) (param i32 i32) (result i32)
    local.get 1
    local.get 0
    i32.const 2
    i32.shl
    i32.add
    i32.load
    local.tee 1
    local.get 0
    i32.store
    local.get 1)
  (table (;0;) 1 1 funcref)
  (export "__indirect_function_table" (table 0))
  (export "__wasm_call_ctors" (func 0))
  (export "threaded" (func 2))
  (export "add" (func 1)))
