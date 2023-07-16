<template>
  <div id="OrderBook">
    <!-- <h1>Order Book</h1> -->
    <section>
      <h2>Order Book</h2>
      <div>
        <ul class="titleList">
          <li class="listTitleText priceText">Price (USD)</li>
          <li class="listTitleText sizeText">Size</li>
          <li class="listTitleText totalText">Total</li>
        </ul>
        <div class="sellBlock">
          <ul
            class="list"
            v-for="([price, [size, total]], index) of top8_Asks"
            :key="index"
          >
            <transition name="highlight" mode="out-in">
              <li :key="price" class="sellText priceText">{{ commaFormat(price) }}</li>
            </transition>
            <transition name="highlight" mode="out-in">
              <li :key="size" class="sizeText">{{ commaFormat(size) }}</li>
            </transition>
            <transition name="highlight" mode="out-in">
              <li :key="total" class="totalText">{{ commaFormat(total) }}</li>
            </transition>
          </ul>
        </div>
      </div>
    </section>

    <button @click="startWebSocket">start connect</button>
    <button @click="subscribe">subscribe</button>
    <button @click="stop">stop</button>
    <!-- <h4>{{ prevSeqNum }}</h4>
    <h4>{{ seqNum }}</h4> -->

    <div v-for="(item, index) of orderBookData" :key="index">
      <h5>type:{{ item.type }}</h5>
      <p>asks:{{ item.asks }}</p>
      <p>bids:{{ item.bids }}</p>
    </div>
    <div>
      <transition name="highlight" mode="out-in">
        <div :key="targetValue">{{ targetValue }}</div>
      </transition>
      <button @click="targetValue += 1">Update Value</button>
    </div>
  </div>
</template>

<script>
export default {
  name: "OrderBook",
  data() {
    return {
      ws: null,
      // seqNum: 0,
      // prevSeqNum: 0,
      targetValue: 0,
      orderBookData: [],
      orderBookMap: {
        asks: new Map(), // [price -> [size, total]]
        bids: new Map(), // [price -> [size, total]]
      },
      top8_Asks: [],
      top8_Bids: [],
      subscriptionOrderBook: {
        op: "subscribe",
        args: ["update:BTC-PERP"],
      },
      unsubscriptionOrderBook: {
        op: "unsubscribe",
        args: ["update:BTC-PERP"],
      },
    };
  },
  computed: {},

  methods: {
    startWebSocket() {
      // console.log(this.ws)
      this.ws = new WebSocket("wss://ws.btse.com/ws/oss/futures");
      console.log(this.ws);
      this.ws.onopen = () => {};
      this.ws.onmessage = (event) => {
        const getData = JSON.parse(event.data).data;

        if (getData) {
          // console.log(getData)
          this.orderBookData.push(getData);
          if (getData.type === "snapshot") {
            this.orderBookMap.asks.clear();
            this.orderBookMap.bids.clear();
            // console.log(getData)
            const [asks, bids] = [getData.asks, getData.bids];
            asks.sort((a, b) => b[0] - a[0]);
            bids.sort((a, b) => b[0] - a[0]);
            for (let i = 0; i < 50; i++) {
              this.orderBookMap["asks"].set(asks[i][0], [
                asks[i][1],
                asks[i][1],
              ]);
              this.orderBookMap["bids"].set(bids[i][0], [
                bids[i][1],
                bids[i][1],
              ]);
            }
            this.top8_Asks = [...this.orderBookMap["asks"]].slice(0, 8);
            this.top8_Bids = [...this.orderBookMap["bids"]].slice(0, 8);
            // console.log(this.top8_Asks)
            // this.top8_Asks.map((item) => {
            //   item[0] = this.commaFormat(item[0]);
            //   item[1][0] = this.commaFormat(item[1][0]);
            //   item[1][1] = this.commaFormat(item[1][1]);
            // });
            // this.top8_Bids.map((item) => {
            //   item[0] = this.commaFormat(item[0]);
            //   item[1][0] = this.commaFormat(item[1][0]);
            //   item[1][1] = this.commaFormat(item[1][1]);
            // });
          }
          // else {
          //   console.log(getData.asks);
          //   const [asks, bids] = [getData.asks, getData.bids];
          //   for(let i = 0; i < asks.length; i++){
          //     if(asks[i][1] === 0){
          //       this.orderBookMap["asks"].delete(asks[i][0]);
          //     }
          //     else{
          //     }
          //   }
          // }
        }
      };
      this.ws.onclose = () => {
        console.log("is Closed");
      };
    },
    commaFormat(n) {
      return n
        .toString()
        .replace(
          /^(-?\d+?)((?:\d{3})+)(?=\.\d+$|$)/,
          function (all, pre, groupOf3Digital) {
            return pre + groupOf3Digital.replace(/\d{3}/g, ",$&");
          }
        );
    },
    subscribe() {
      if (this.ws) {
        this.ws.send(JSON.stringify(this.subscriptionOrderBook));
      }
    },
    stop() {
      if (this.ws) {
        this.ws.send(JSON.stringify(this.unsubscriptionOrderBook));
      }
    },
  },

  created() {
    this.top8_Asks = Array(8)
      .fill()
      .map(() => [0, [0, 0]]);
    this.top8_Bids = Array(8)
      .fill()
      .map(() => [0, [0, 0]]);
    this.startWebSocket();
  },

  watch: {},
};
</script>

<style lang="sass">
@mixin size($w, $h:$w)
  width: $w
  height: $h

.buyText
  color: #00b15d
.sellText
  color: #FF5B5A
.listTitleText
  color: #8698aa

.priceText
  text-align: center
.sizeText
  text-align: right
.totalText
  text-align: right

h1, h2, h3, h4, h5, li
  color: #F0F4F8

#OrderBook
  *
    border: 1px solid green
  +size(90%, 400px)
  margin: 0 auto
  max-width: 500px
section
  background-color: #131B29
  h2
    text-align: left
    padding: 10px 5%
    border-bottom: 1px solid rgba(#fff, 0.3)

.titleList, .list
  display: flex
  li
    flex: 1
.list
  li
    padding: 5px 0

.titleList, .sellBlock
  padding: 8px 5%

.highlight-enter-active
  animation: highlight-Animation 0.5s

@keyframes highlight-Animation
  0%
    background-color: yellow
  100%
    background-color: white
</style>