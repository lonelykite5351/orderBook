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

        <!-- sell price block -->
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

        <!-- current BuyPrice -->
        <div
          class="current_BuyPrice_Block"
          :class="{
            sellColor: buyPrice_Animation_Active.sell,
            buyColor: buyPrice_Animation_Active.buy,
          }"
        >
          <div>
            <h3>{{ commaFormat(currentBuyPrice) }}</h3>
            <span
              class="downArrow sellText"
              v-show="buyPrice_Animation_Active.sell"
              >⇩</span
            >
            <span class="upArrow buyText" v-show="buyPrice_Animation_Active.buy"
              >⇧</span
            >
          </div>
        </div>

        <!-- buy price block -->
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
    <button @click="startWebSocket2">startWebSocket2</button>
    <!-- <button @click="subscribe(ws1, subscriptionOrderBook)">subscribe 1</button>
    <button @click="stop(ws1, unsubscriptionOrderBook)">stop 1</button>
    <button @click="subscribe(ws2, subscriptionPriceUpdate)">
      subscribe 2
    </button>
    <button @click="stop(ws2, unsubscriptionPriceUpdate)">stop 2</button> -->
    <button @click="subscribeAll">Subscribe All</button>
    <button @click="stopAll">Stop All</button>

    <!-- <div>
      <transition name="highlight" mode="out-in">
        <div :key="targetValue">{{ targetValue }}</div>
      </transition>
      <button @click="targetValue += 1">Update Value</button>
    </div> -->
  </div>
</template>

<script>
export default {
  name: "OrderBook",
  data() {
    return {
      ws1: new WebSocket("wss://ws.btse.com/ws/oss/futures"),
      ws2: new WebSocket("wss://ws.btse.com/ws/futures"),
      // targetValue: 0,
      currentBuyPrice: 0,
      orderBookMap: {
        asks: new Map(), // Map: { price -> [size, total] }
        bids: new Map(), // Map: { price -> [size, total] }
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
      buyPrice_Animation_Active: { sell: false, buy: true },
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

    // update current price in HashMap, sorted it first then slice top 8
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

    // if current price is on top 8, update size
    update_Size(i, price, size, prevTotal, targetListName) {
      if (targetListName === "asks") {
        const prevSize = this.top8_Asks[i][1][0]; // [i] = [price, [size, total]]

        // update size immediately
        this.$set(this.top8_Asks, i, [price, [size, prevTotal + size]]);
        // sell Animation
        if (size < prevSize) {
          this.asks_Size_Animation_Active[i][0] = true;
        }
        // buy Animation
        else if (size > prevSize) {
          this.asks_Size_Animation_Active[i][1] = true;
        }

        // remove animation's class binding after 700ms
        setTimeout(() => {
          this.asks_Size_Animation_Active[i] = [false, false];
        }, 700);
      } else if (targetListName === "bids") {
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
          this.update_Top8();
        }
      };
      this.ws1.onclose = () => {
        console.log("is Closed 1");
        // alert("WebSocket 1 is Closed");
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
    subscribeAll(){
      this.ws1.send(JSON.stringify(this.subscriptionOrderBook));
      this.ws2.send(JSON.stringify(this.subscriptionPriceUpdate));
    },
    stopAll(){
      this.ws1.send(JSON.stringify(this.unsubscriptionOrderBook));
      this.ws2.send(JSON.stringify(this.unsubscriptionPriceUpdate));
    },
    startWebSocket2() {
      console.log(this.ws2);
      this.ws2.onopen = () => {};
      this.ws2.onmessage = (event) => {
        const getData = JSON.parse(event.data).data;
        // get first price in the array, compare with previous price
        if (getData !== undefined) {
          const prevPrice = this.currentBuyPrice;
          const currentPrice = getData[0].price;
          this.currentBuyPrice = currentPrice;
          // console.log([prevPrice, currentPrice]);
          if (currentPrice >= prevPrice) {
            this.buyPrice_Animation_Active.buy = true;
            this.buyPrice_Animation_Active.sell = false;
          } else {
            this.buyPrice_Animation_Active.buy = false;
            this.buyPrice_Animation_Active.sell = true;
          }
        }
      };
      this.ws2.onclose = () => {
        console.log("is Closed 2");
        // alert("WebSocket 2 is Closed");
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

.current_BuyPrice_Block
  display: flex
  justify-content: center
  align-items: center
  padding: 8px 5%
  &.sellColor
    background-color: rgba(255, 91, 90, 0.5)
  &.buyColor
    background-color: rgba(0, 177, 93, 0.5)
  h3
    font-size: 24px
    display: inline-block
  span
    font-size: 24px
    margin-left: 10px

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