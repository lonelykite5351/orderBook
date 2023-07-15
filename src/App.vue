<template>
  <div id="app">
    <!-- <img alt="Vue logo" src="./assets/logo.png" /> -->
    <!-- <HelloWorld msg="Welcome to Your Vue.js App"/> -->

    <OrderBook />
  </div>
</template>

<script>
// import HelloWorld from './components/HelloWorld.vue'
import OrderBook from "./components/OrderBook.vue";

export default {
  name: "App",
  components: {
    // HelloWorld,
    OrderBook,
  },
  data() {
    return {};
  },

  methods: {},

  created() {},
};
</script>

<style lang="sass">
// @import "@/necolas.github.io_normalize.css_8.0.1_normalize.css"
@import "@/ResetCSS.css"

#app
  font-family: Avenir, Helvetica, Arial, sans-serif
  -webkit-font-smoothing: antialiased
  -moz-osx-font-smoothing: grayscale
  text-align: center
  color: #2c3e50
  margin-top: 60px
</style>
