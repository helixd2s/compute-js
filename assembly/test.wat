(module
  (type (;0;) (func (param i32 i32) (result i32)))
  (import "env" "memory" (memory (;0;) 2 256 shared))
  (func (;0;) (type 0) (param i32 i32) (result i32)
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
  (func (;1;) (type 0) (param i32 i32) (result i32)
    (local i32)
    i32.const 66560
    local.tee 2
    local.get 0
    i32.store offset=12
    local.get 2
    local.get 1
    i32.atomic.rmw.add offset=12)
  (export "threaded" (func 0))
  (export "add" (func 1)))
