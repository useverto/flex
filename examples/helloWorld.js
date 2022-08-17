export async function handle(state, action) {
  
  if (action.input.function === 'Hello') {
    state.heardHello = true;
  }
  if (action.input.function === 'World') {
    state.heardWorld = true;
  }
  if (state.heardHello && state.heardWorld) {
    state.happy = true;
  }
  return { state }
}