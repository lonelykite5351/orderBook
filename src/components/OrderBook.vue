<template>
  <div id="OrderBook">
    <!-- <h1>Order Book</h1> -->
    <section class="orderBook_Section">
      <h2>Order Book</h2>
      <div class="listContainer">
        <ul class="titleList">
          <li class="listTitleText priceText">Price (USD)</li>
          <li class="listTitleText sizeText">Size</li>
          <li class="listTitleText totalText">Total</li>
        </ul>
        <div class="block sellBlock">
          <TransitionGroup name="highlightSell" mode="out-in">
            <ul
              class="list"
              v-for="([price, [size, total]], i) of top8_Asks"
              :key="price"
            >
              <li class="sellText priceText">
                {{ commaFormat(price) }}
              </li>
              <li
                class="sizeText"
                :class="{
                  sell_AnimateClass: asks_Size_Animation_Active[i][0],
                  buy_AnimateClass: asks_Size_Animation_Active[i][1],
                }"
              >
                {{ commaFormat(size) }}
              </li>
              <li class="totalText">
                {{ commaFormat(total) }}
                <div
                  class="bar"
                  :style="{
                    width: get_Percentage(
                      total,
                      get_top8_MaxTotalSize(top8_Asks)
                    ),
                  }"
                ></div>
              </li>
            </ul>
          </TransitionGroup>
        </div>

        <div class="block buyBlock">
          <TransitionGroup name="highlightBuy" mode="out-in">
            <ul
              class="list"
              v-for="([price, [size, total]], i) of top8_Bids"
              :key="price"
            >
              <li class="buyText priceText">
                {{ commaFormat(price) }}
              </li>
              <li
                class="sizeText"
                :class="{
                  sell_AnimateClass: bids_Size_Animation_Active[i][0],
                  buy_AnimateClass: bids_Size_Animation_Active[i][1],
                }"
              >
                {{ commaFormat(size) }}
              </li>
              <li class="totalText">
                {{ commaFormat(total) }}
                <div
                  class="bar"
                  :style="{
                    width: get_Percentage(
                      total,
                      get_top8_MaxTotalSize(top8_Bids)
                    ),
                  }"
                ></div>
              </li>
            </ul>
          </TransitionGroup>
        </div>
      </div>
    </section>

    <button @click="startWebSocket1">startWebSocket1</button>
    <!-- <button @click="startWebSocket2">startWebSocket2</button> -->
    <button @click="subscribe(ws1, subscriptionOrderBook)">subscribe 1</button>
    <button @click="stop(ws1, unsubscriptionOrderBook)">stop 1</button>
    <!-- <button @click="subscribe(ws2, subscriptionPriceUpdate)">
      subscribe 2
    </button> -->
    <!-- <button @click="stop(ws2, unsubscriptionPriceUpdate)">stop 2</button> -->
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
      bids_Size_Animation_Active: Array(8)
        .fill()
        .map(() => [false, false]),
    };
  },
  computed: {},

  methods: {
    commaFormat(n) {
      return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },
    get_Percentage(size, total) {
      return (size / total).toFixed(2) * 100 + "%";
    },
    get_top8_MaxTotalSize(arr) {
      let max = 0;
      for (let i = 0; i < arr.length; i++) {
        max = Math.max(max, arr[i][1][1]);
      }
      return max;
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
    update_Delta_Price(target, getList) {
      for (let [price, size] of getList) {
        price *= 1;
        size *= 1;
        if (size !== 0) {
          if (!this.orderBookMap[target].has(price)) {
            this.orderBookMap[target].set(price, [0, 0]);
          }
          const prevTotal = this.orderBookMap[target].get(price)[1];

          for (let i = 0; i < 8; i++) {
            // current price is in top 8 list, update size at first, then active animation
            if (target === "asks" && this.top8_Asks[i][0] === price) {
              this.update_Size(i, price, size, prevTotal, "asks");
              break; // just only one, so break it.
            } else if (target === "bids" && this.top8_Bids[i][0] === price) {
              this.update_Size(i, price, size, prevTotal, "bids");
              break; // just only one, so break it.
            }
          }

          // update Map
          this.orderBookMap[target].get(price)[0] = size;
          this.orderBookMap[target].get(price)[1] = prevTotal + size;
        } else {
          this.orderBookMap[target].delete(price);
        }
      }
    },

    update_Size(i, price, size, prevTotal, targetListName) {
      if(targetListName === "asks"){
        const prevSize = this.top8_Asks[i][1][0]; // [i] = [price, [size, total]]

        // update size immediately
        this.$set(this.top8_Asks, i, [price, [size, prevTotal + size]]);
        // sell
        if (size < prevSize) {
          this.asks_Size_Animation_Active[i][0] = true;
        }
        // buy
        else if (size > prevSize) {
          this.asks_Size_Animation_Active[i][1] = true;
        }

        // remove animation's class binding after 700ms
        setTimeout(() => {
          this.asks_Size_Animation_Active[i] = [false, false];
        }, 700);
      }
      else if(targetListName === "bids"){
        const prevSize = this.top8_Bids[i][1][0]; // [i] = [price, [size, total]]

        // update size immediately
        this.$set(this.top8_Bids, i, [price, [size, prevTotal + size]]);
        // sell
        if (size < prevSize) {
          this.bids_Size_Animation_Active[i][0] = true;
        }
        // buy
        else if (size > prevSize) {
          this.bids_Size_Animation_Active[i][1] = true;
        }

        // remove animation's class binding after 700ms
        setTimeout(() => {
          this.bids_Size_Animation_Active[i] = [false, false];
        }, 700);
      }

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
          this.update_Delta_Price("asks", getData.asks);
          this.update_Delta_Price("bids", getData.bids);
          
          // update asks price
          /*
          for (let [price, size] of getData.asks) {
            price *= 1;
            size *= 1;
            if (size !== 0) {
              if (!this.orderBookMap["asks"].has(price)) {
                this.orderBookMap["asks"].set(price, [0, 0]);
              }
              const prevTotal = this.orderBookMap["asks"].get(price)[1];

              // current price is in top 8 list, update size at first, then active animation
              for (let i = 0; i < 8; i++) {
                if (this.top8_Asks[i][0] === price) {
                  const prevSize = this.top8_Asks[i][1][0]; // [i] = [price, [size, total]]
                  // console.log([price, prevSize, size]);

                  // update size immediately
                  this.$set(this.top8_Asks, i, [
                    price,
                    [size, prevTotal + size],
                  ]);
                  // sell
                  if (size < prevSize) {
                    this.asks_Size_Animation_Active[i][0] = true;
                  }
                  // buy
                  else if (size > prevSize) {
                    this.asks_Size_Animation_Active[i][1] = true;
                  }

                  // remove animation's class binding after 700ms
                  setTimeout(() => {
                    this.asks_Size_Animation_Active[i] = [false, false];
                  }, 700);

                  this.$forceUpdate();
                  break; // just only one, so break it.
                }
              }

              // update Map
              this.orderBookMap["asks"].get(price)[0] = size;
              this.orderBookMap["asks"].get(price)[1] = prevTotal + size;
            } else {
              this.orderBookMap["asks"].delete(price);
            }
          }
          */

          this.update_Top8();
        }
      };
      this.ws1.onclose = () => {
        console.log("is Closed 1");
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
        console.log("is Closed 2");
      };
    },
  },

  created() {
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
  max-width: 400px
.orderBook_Section
  background-color: #131B29
  padding: 10px 0
  h2
    text-align: left
    padding: 0 5% 10px 5%
    border-bottom: 1px solid rgba(#fff, 0.3)

.titleList, .list
  display: flex
  li
    flex: 1
.list
  +size(100%, auto)
  li
    padding: 5px 0
    position: relative

.block
  height: 210px
  padding: 0 5%
  overflow: hidden
  margin: 10px 0

.titleList
  padding: 0 5%
  margin-top: 8px

.bar
  width: 0
  height: 100%
  position: absolute
  right: 0
  top: 0
  transition: .3s

.sellBlock .bar
  background-color: rgba(255, 90, 90, 0.12)
.buyBlock .bar
  background-color: rgba(16, 186, 104, 0.12)

.highlightSell-enter-active, .sell_AnimateClass
  animation: highlightSell-Animation .7s
  animation-timing-function: ease-in-out

.highlightBuy-enter-active, .buy_AnimateClass
  animation: highlightBuy-Animation .7s
  animation-timing-function: ease-in-out

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