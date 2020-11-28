(module
  (type (;0;) (func (param i32) (result i32)))
  (type (;1;) (func (param i32 i32) (result i32)))
  (import "env" "console_i32" (func $env::console_i32_int_ (type 0)))
  (func $index::add_int__int_ (type 1) (param i32 i32) (result i32)
    local.get 0
    call $env::console_i32_int_
    drop
    local.get 0
    local.get 0
    i32.mul
    local.get 1
    i32.add)
  (table (;0;) 1 1 funcref)
  (memory (;0;) 2)
  (global (;0;) (mut i32) (i32.const 66560))
  (export "memory" (memory 0))
  (export "add" (func $index::add_int__int_)))
