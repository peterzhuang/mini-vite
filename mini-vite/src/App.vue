<template>
  <div class="greeting">
    {{ title }}
  </div>
</template>

<script>
import { reactive, toRefs } from "vue";

export default {
  setup() {
    const state = reactive({
      title: "hello, mini-vite is here",
    });

    return {
      ...toRefs(state),
    };
  },
};
</script>

<style>
.greeting {
  color: red;
  font-weight: bold;
}
</style>
