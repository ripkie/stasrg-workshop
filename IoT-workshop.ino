#include <Wire.h>
#include <DHT.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_ADXL345_U.h>

#define DHTPIN 4
#define DHTTYPE DHT22

#define PIEZO_PIN 35

#define MQ_AO 34
#define MQ_DO 27

#define SDA_PIN 21
#define SCL_PIN 22

DHT dht(DHTPIN, DHTTYPE);
Adafruit_ADXL345_Unified adxl = Adafruit_ADXL345_Unified(12345);

bool adxlReady = false;

void setup()
{
  Serial.begin(115200);
  delay(1000);

  Serial.println("Mulai cek sensor...");

  dht.begin();

  pinMode(MQ_DO, INPUT);

  Wire.begin(SDA_PIN, SCL_PIN);

  if (adxl.begin())
  {
    adxl.setRange(ADXL345_RANGE_16_G);
    adxlReady = true;
    Serial.println("ADXL345 terdeteksi");
  }
  else
  {
    adxlReady = false;
    Serial.println("ADXL345 tidak terdeteksi");
  }

  Serial.println("Setup selesai");
  Serial.println();
}

void loop()
{
  Serial.println("========== DATA SENSOR ==========");

  float suhu = dht.readTemperature();
  float kelembapan = dht.readHumidity();

  if (isnan(suhu) || isnan(kelembapan))
  {
    Serial.println("DHT22: tidak terdeteksi / gagal baca");
  }
  else
  {
    Serial.print("DHT22 Suhu       : ");
    Serial.print(suhu);
    Serial.println(" C");

    Serial.print("DHT22 Kelembapan : ");
    Serial.print(kelembapan);
    Serial.println(" %");
  }

  int piezoValue = analogRead(PIEZO_PIN);

  Serial.print("Piezoelektrik    : ");
  Serial.println(piezoValue);

  int mqAnalog = analogRead(MQ_AO);
  int mqDigital = digitalRead(MQ_DO);

  Serial.print("MQ Analog AO     : ");
  Serial.println(mqAnalog);

  Serial.print("MQ Digital DO    : ");
  Serial.println(mqDigital);

  if (mqDigital == HIGH)
  {
    Serial.println("MQ Status        : gas terdeteksi / melewati threshold");
  }
  else
  {
    Serial.println("MQ Status        : normal / belum melewati threshold");
  }

  if (adxlReady)
  {
    sensors_event_t event;
    adxl.getEvent(&event);

    Serial.print("ADXL X           : ");
    Serial.print(event.acceleration.x);
    Serial.println(" m/s^2");

    Serial.print("ADXL Y           : ");
    Serial.print(event.acceleration.y);
    Serial.println(" m/s^2");

    Serial.print("ADXL Z           : ");
    Serial.print(event.acceleration.z);
    Serial.println(" m/s^2");
  }
  else
  {
    Serial.println("ADXL345          : tidak terdeteksi");
  }

  Serial.println("=================================");
  Serial.println();

  delay(1000);
}