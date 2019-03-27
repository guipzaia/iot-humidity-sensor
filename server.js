// Importing libraries
const mqtt = require('mqtt');
const five = require("johnny-five");

// Importing custom configurations
const config = require('./config');

// Setting custom configurations
const server = config.server;
const topic_bot_sensor = config.topic_bot_sensor;
const topic_sensor_bot = config.topic_sensor_bot;

// USB port
const usbPort = "/dev/ttyACM0"

// Setting pin configurations
const humiditySensorPin = "A0";
const ledGreenPin  = 10;
const ledYellowPin = 11;
const ledRedPin    = 12;
const relayPin     = 13;

// Setting humidity sensor limits
const l0 = 0;
const l3 = 400;
const l5 = 600;
const l9 = 1023;

// Setting  MQTT server configurations
const mqttServer = mqtt.connect(server);

// Setting board configuration
const board = new five.Board({
    port: usbPort,
});

//--------------------------------------------------------------------------
// CONNECTING SERVICES
//--------------------------------------------------------------------------
mqttServer.on('connect', function () {

    if (mqttServer.connected) {
        console.log('MQTT server is now ready!');
    }

    mqttServer.subscribe(topic_bot_sensor);
    mqttServer.subscribe(topic_sensor_bot);

});

//--------------------------------------------------------------------------
// BOARD CONTROLS
//--------------------------------------------------------------------------

var auxValue;
var relay;

board.on("ready", function() {

    console.log('Board is now ready!');

    // Humidity sensor
    const sensor = new five.Sensor(humiditySensorPin);

    // Leds
    const greenLed  = new five.Led(ledGreenPin);
    const yellowLed = new five.Led(ledYellowPin);
    const redLed    = new five.Led(ledRedPin);

    // Relay
    relay = new five.Relay(relayPin);

    this.repl.inject({
        relay: relay
    });

    sensor.on("change", function(value) {

        auxValue = value;

        if (value >= l0) {

            greenLed.off();
            yellowLed.off();
            redLed.off();

            // HIGH
            if (value <= l3) {
                redLed.on();
                relay.off();

            // MEDIUM
            } else if (value <= l5) {
                yellowLed.on();

            // LOW
            } else if (value <= l9) {
                greenLed.on();
            }
        }

    });

});

//--------------------------------------------------------------------------
// MQTT LISTENER
//--------------------------------------------------------------------------

mqttServer.on('message', function (topic, message) {

    if (topic === topic_bot_sensor) {

        switch (message.toString()) {

            case "0" :
                relay.off();
                mqttServer.publish(topic_sensor_bot, "Sensor off");
                break;

            case "1" :
                relay.on();
                mqttServer.publish(topic_sensor_bot, "Sensor on");
                break;

            case "2" :

                if (relay.isOn) {
                    mqttServer.publish(topic_sensor_bot, "Sensor is on");

                } else {
                    mqttServer.publish(topic_sensor_bot, "Sensor is off");
                }

                break;

            case "3" :

                var humidity;

                // HIGH
                if (auxValue <= l3) {
                    humidity = "High"

                // MEDIUM
                } else if (auxValue <= l5) {
                    humidity = "Medium"

                // LOW
                } else if (auxValue <= l9) {
                    humidity = "Low"
                }

                mqttServer.publish(topic_sensor_bot, "Humidity: " + humidity + " (" + auxValue.toString() + ")");
                break;
        }
    }

}); 