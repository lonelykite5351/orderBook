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
        <div class="block">
          <TransitionGroup name="highlightSell" mode="out-in">
            <ul
              class="list"
              v-for="([price, [size, total]], i) of top8_Asks"
              :key="price"
            >
              <!-- <transition name="" mode="out-in"> -->
              <li class="sellText priceText">
                {{ commaFormat(price) }}
              </li>
              <!-- </transition> -->
              <!-- <transition name="" mode="out-in"> -->
              <li class="sizeText" :class="{sell_AnimateClass: asks_Size_Animation_Active[i][0], buy_AnimateClass: asks_Size_Animation_Active[i][1]}">
                {{ commaFormat(size) }}
              </li>
              <!-- </transition> -->
              <!-- <transition name="" mode="out-in"> -->
              <li class="totalText">{{ commaFormat(total) }}</li>
              <!-- </transition> -->
            </ul>
          </TransitionGroup>
        </div>

        <!-- <div class="block">
          <TransitionGroup name="highlightSell" mode="out-in">
            <ul
              class="list"
              v-for="[price, [size, total]] of top8_Bids"
              :key="price"
            >
              <transition name="" mode="out-in">
                <li :key="price" class="buyText priceText">
                  {{ commaFormat(price) }}
                </li>
              </transition>
              <transition name="" mode="out-in">
                <li :key="size" class="sizeText">{{ commaFormat(size) }}</li>
              </transition>
              <transition name="" mode="out-in">
                <li :key="total" class="totalText">{{ commaFormat(total) }}</li>
              </transition>
            </ul>
          </TransitionGroup>
        </div> -->
      </div>
    </section>

    <button @click="startWebSocket1">start connect 1</button>
    <button @click="startWebSocket2">start connect 2</button>
    <button @click="subscribe(ws1, subscriptionOrderBook)">subscribe 1</button>
    <button @click="stop(ws1, unsubscriptionOrderBook)">stop 1</button>
    <button @click="subscribe(ws2, subscriptionPriceUpdate)">
      subscribe 2
    </button>
    <button @click="stop(ws2, unsubscriptionPriceUpdate)">stop 2</button>
    <!-- <h4>{{ prevSeqNum }}</h4>
    <h4>{{ seqNum }}</h4> -->

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
      ws1: new WebSocket("wss://ws.btse.com/ws/oss/futures"),
      ws2: new WebSocket("wss://ws.btse.com/ws/futures"),
      // seqNum: 0,
      // prevSeqNum: 0,
      targetValue: 0,
      orderBookMap: {
        asks: new Map(), // [price -> [size, total]]
        bids: new Map(), // [price -> [size, total]]
      },
      top8_Asks: Array(8)
        .fill()
        .map((_, i) => [i, [0, 0]]), // [i] = [price, [size, total]]
      top8_Bids: Array(8)
        .fill()
        .map((_, i) => [i, [0, 0]]), // [i] = [price, [size, total]]
      subscriptionOrderBook: {
        op: "subscribe",
        args: ["update:BTC-PERP"],
      },
      unsubscriptionOrderBook: {
        op: "unsubscribe",
        args: ["update:BTC-PERP"],
      },
      subscriptionPriceUpdate: {
        op: "subscribe",
        args: ["tradeHistoryApi:BTCPFC"],
      },
      unsubscriptionPriceUpdate: {
        op: "unsubscribe",
        args: ["tradeHistoryApi:BTCPFC"],
      },

      // [i] = [sell animation active, buy animation active]
      asks_Size_Animation_Active: Array(8)
        .fill()
        .map(() => [false, false]),
    };
  },
  computed: {},

  methods: {
    commaFormat(n) {
      return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },
    update_Top8() {
      const top8_Asks = [...this.orderBookMap["asks"]]
        .sort((a, b) => b[0] - a[0])
        .slice(0, 8);
      const top8_Bids = [...this.orderBookMap["bids"]]
        .sort((a, b) => b[0] - a[0])
        .slice(0, 8);
      for (let i = 0; i < 8; i++) {
        this.top8_Asks[i] = top8_Asks[i];
        this.top8_Bids[i] = top8_Bids[i];
      }
      this.$forceUpdate();
    },
    startWebSocket1() {
      console.log(this.ws1);
      this.ws1.onopen = () => {};
      this.ws1.onmessage = (event) => {
        const getData = JSON.parse(event.data).data;
        // console.log(getData);
        if (getData === undefined) {
          return;
        }
        if (getData.type === "snapshot") {
          this.orderBookMap.asks.clear();
          this.orderBookMap.bids.clear();
          // console.log(getData)
          const [asks, bids] = [getData.asks, getData.bids];
          // asks.sort((a, b) => b[0] - a[0]);
          // bids.sort((a, b) => b[0] - a[0]);
          for (let i = 0; i < 50; i++) {
            const [priceAsks, sizeAsks] = [asks[i][0] * 1, asks[i][1] * 1];
            const [priceBids, sizeBids] = [bids[i][0] * 1, bids[i][1] * 1];
            this.orderBookMap["asks"].set(priceAsks, [sizeAsks, sizeAsks]);
            this.orderBookMap["bids"].set(priceBids, [sizeBids, sizeBids]);
          }
          this.update_Top8();
        } else if (getData.type === "delta") {
          // update asks price
          for (let [price, size] of getData.asks) {
            price *= 1;
            size *= 1;
            if (size !== 0) {
              if (!this.orderBookMap["asks"].has(price)) {
                this.orderBookMap["asks"].set(price, [0, 0]);
              }
              const prevTotal = this.orderBookMap["asks"].get(price)[1];
              // console.log(prevSize);
              
              // current price is in top 8 list, update size, active animation
              for(let i = 0; i < 8; i++){
                if(this.top8_Asks[i][0] === price){
                  const prevSize = this.top8_Asks[i][1][0]; // [i] = [price, [size, total]]
                  console.log([price, prevSize, size]);
                  // sell
                  if(size < prevSize){
                    this.asks_Size_Animation_Active[i][0] = true;
                  }
                  // buy
                  else if (size > prevSize){
                    this.asks_Size_Animation_Active[i][1] = true;
                  }
                  // remove animation class binding
                  // setTimeout(() => {
                  //   this.asks_Size_Animation_Active[i] = [false, false];
                  // }, 700);

                  this.top8_Asks[i][1][0] = size;
                  this.$forceUpdate();

                  break;
                }
              }


              this.orderBookMap["asks"].get(price)[0] = size;
              this.orderBookMap["asks"].get(price)[1] = prevTotal + size;
            } else {
              this.orderBookMap["asks"].delete(price);
            }
          }

          this.update_Top8();
        }
      };
      this.ws1.onclose = () => {
        console.log("is Closed");
      };
    },
    subscribe(ws, message) {
      if (ws) {
        ws.send(JSON.stringify(message));
      }
    },
    stop(ws, message) {
      if (ws) {
        ws.send(JSON.stringify(message));
      }
    },

    startWebSocket2() {
      console.log(this.ws2);
      this.ws2.onopen = () => {};
      this.ws2.onmessage = (event) => {
        // console.log(event.data)
        const getData = JSON.parse(event.data).data;
        if (getData !== undefined) {
          console.log(getData);
        }
      };
      this.ws2.onclose = () => {
        console.log("is Closed");
      };
    },
  },

  created() {
    // this.top8_Asks = Array(8)
    //   .fill()
    //   .map((_, i) => [i, [0, 0]]);
    // this.top8_Bids = Array(8)
    //   .fill()
    //   .map((_, i) => [i, [0, 0]]);
    this.startWebSocket1();
    this.startWebSocket2();
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
  text-align: left
.sizeText
  text-align: right
.totalText
  text-align: right

h1, h2, h3, h4, h5, li
  color: #F0F4F8

#OrderBook
  *
    // border: 1px solid green
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
  +size(100%, auto)
  li
    padding: 5px 0

.block
  height: 250px
  padding: 0 5%

.titleList
  padding: 8px 5%

.highlightSell-enter-active
  animation: highlightSell-Animation .7s
  animation-timing-function: ease-in-out

.sell_AnimateClass
  animation: highlightSell-Animation .7s
  animation-timing-function: ease-in-out
  background-color: rgba(255, 91, 90, 0.5)
.buy_AnimateClass
  animation: highlightBuy-Animation .7s
  animation-timing-function: ease-in-out
  background-color: rgba(0, 177, 93, 0.5)

@keyframes highlightSell-Animation
  0%
    background-color: rgba(255, 91, 90, 0.5)
  100%
    background-color: transparent

@keyframes highlightBuy-Animation
  0%
    background-color: rgba(0, 177, 93, 0.5)
  100%
    background-color: transparent
</style>