<template>
  <div id="app">
    <img alt="Vue logo" src="./assets/logo.png" />
    <!-- <HelloWorld msg="Welcome to Your Vue.js App"/> -->
    <h1>{{ prevSeqNum }}</h1>
    <h1>{{ seqNum }}</h1>
    <button @click="start">start connect</button>
    <button @click="send">send</button>
    <button @click="stop">stop</button>
  </div>
</template>

<script>
// import HelloWorld from './components/HelloWorld.vue'

export default {
  name: "App",
  components: {
    // HelloWorld
  },
  data() {
    return {
      ws: null,
      seqNum: 0,
      prevSeqNum: 0,
      getData: null,
      subscription: {
        op: "subscribe",
        args: ["update:BTC-PERP"],
      },
      // unsubscription: {
      //   op: "unsubscribe",
      //   args: ["update:BTC-PERP"],
      // },
    };
  },

  methods: {
    start() {
      // console.log(this.ws)
      this.ws = new WebSocket("wss://ws.btse.com/ws/oss/futures");
      console.log(this.ws);
      this.ws.onopen = () => {};
      this.ws.onmessage = (event) => {
        const getData = JSON.parse(event.data).data;
        if(getData){
          console.log(getData)
          this.seqNum = getData.seqNum
          this.prevSeqNum = getData.prevSeqNum
        }
      };
      this.ws.onclose = () => {
        console.log("is Closed");
      };
    },
    send() {
      if(this.ws){
        this.ws.send(JSON.stringify(this.subscription));
      }
    },
    stop() {
      if(this.ws){
        this.ws.close()
      }
    },
  },

  created() {
    this.start();
  },
};
</script>

<style lang="sass">
#app
  font-family: Avenir, Helvetica, Arial, sans-serif
  -webkit-font-smoothing: antialiased
  -moz-osx-font-smoothing: grayscale
  text-align: center
  color: #2c3e50
  margin-top: 60px
</style>
