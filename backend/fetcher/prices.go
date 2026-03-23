package fetcher

import (
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"

	"lpnfuel/models"
)

// ── PTTOR Provincial SOAP API ──────────────────────────────────────

const pttorSOAPURL = "https://orapiweb.pttor.com/oilservice/OilPrice.asmx"

const pttorSOAPEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <CurrentOilPriceProvincial xmlns="http://www.pttor.com">
      <Language>en</Language>
      <Province>Lamphun</Province>
    </CurrentOilPriceProvincial>
  </soap12:Body>
</soap12:Envelope>`

// pttorSOAPResponse parses the SOAP envelope
type pttorSOAPResponse struct {
	Body struct {
		Result struct {
			Value string `xml:",chardata"`
		} `xml:"CurrentOilPriceProvincialResponse>CurrentOilPriceProvincialResult"`
	} `xml:"Body"`
}

type pttorDS struct {
	Fuels []pttorFuel `xml:"FUEL_PROVINCIAL"`
}

type pttorFuel struct {
	Location string `xml:"LOCATION"`
	Product  string `xml:"PRODUCT"`
	Price    string `xml:"PRICE"`
}

// pttorDistrictMap maps PTTOR English location names to Thai district names
var pttorDistrictMap = map[string]string{
	"Mueang Lamphun":   "เมืองลำพูน",
	"Li":               "ลี้",
	"Ban Hong":         "บ้านโฮ่ง",
	"Thung Hua Chang":  "ทุ่งหัวช้าง",
	"Pa Sang":          "ป่าซาง",
	"Ban Thi":          "บ้านธิ",
	"Mae Tha":          "แม่ทา",
	"Wiang Nong Long":  "เวียงหนองล่อง",
}

// pttorProductToFuelType maps PTTOR English product names to our fuel_type keys
var pttorProductToFuelType = map[string]string{
	"Diesel":             "diesel",
	"Gasohol 91":         "gasohol91",
	"Gasohol 95":         "gasohol95",
	"Gasohol E20":        "gasoholE20",
	"Gasohol E85":        "gasoholE85",
	"Gasoline 95":        "benzin95",
	"Premium Diesel":     "premium_diesel",
	"Super Power GSH95":  "super_power_gsh95",
}

func FetchPTTORPrices() ([]models.FuelPrice, error) {
	req, err := http.NewRequest("POST", pttorSOAPURL, strings.NewReader(pttorSOAPEnvelope))
	if err != nil {
		return nil, fmt.Errorf("pttor request: %w", err)
	}
	req.Header.Set("Content-Type", "application/soap+xml; charset=utf-8")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("pttor fetch: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("pttor read: %w", err)
	}

	// Parse SOAP envelope
	var soapResp pttorSOAPResponse
	if err := xml.Unmarshal(body, &soapResp); err != nil {
		return nil, fmt.Errorf("pttor xml: %w", err)
	}

	innerXML := soapResp.Body.Result.Value
	if innerXML == "" {
		return nil, fmt.Errorf("pttor: empty response")
	}

	// Parse inner XML (HTML-decoded by xml.Unmarshal)
	var ds pttorDS
	if err := xml.Unmarshal([]byte(innerXML), &ds); err != nil {
		return nil, fmt.Errorf("pttor inner xml: %w", err)
	}

	// Store prices for all Lamphun districts
	var prices []models.FuelPrice
	seen := map[string]bool{} // key: "district:fuelType"
	for _, f := range ds.Fuels {
		district, ok := pttorDistrictMap[f.Location]
		if !ok {
			continue // skip unknown locations
		}
		fuelType, ok := pttorProductToFuelType[f.Product]
		if !ok {
			continue
		}
		key := district + ":" + fuelType
		if seen[key] {
			continue
		}
		price, err := strconv.ParseFloat(strings.TrimSpace(f.Price), 64)
		if err != nil || price <= 0 {
			continue
		}
		seen[key] = true
		prices = append(prices, models.FuelPrice{
			Brand:    "PTT",
			District: district,
			FuelType: fuelType,
			Price:    price,
		})
	}

	log.Printf("PTTOR: fetched %d fuel prices for %d districts in Lamphun", len(prices), len(pttorDistrictMap))
	return prices, nil
}

// ── Bangchak REST API ──────────────────────────────────────────────

const bangchakURL = "https://oil-price.bangchak.co.th/ApiOilPrice2/th"

type bangchakResponse struct {
	OilList string `json:"OilList"`
}

type bangchakOil struct {
	OilName    string  `json:"OilName"`
	PriceToday float64 `json:"PriceToday"`
}

var bangchakNameToFuelType = map[string]string{
	"ไฮดีเซล S":                      "diesel",
	"แก๊สโซฮอล์ 91 S EVO":            "gasohol91",
	"แก๊สโซฮอล์ 95 S EVO":            "gasohol95",
	"แก๊สโซฮอล์ E20 S EVO":           "gasoholE20",
	"แก๊สโซฮอล์ E85 S EVO":           "gasoholE85",
	"ไฮพรีเมียมดีเซล S":              "premium_diesel",
	"ไฮพรีเมียม 97 แก๊สโซฮอล์ 95":    "super_power_gsh95",
}

func FetchBangchakPrices() ([]models.FuelPrice, error) {
	resp, err := http.Get(bangchakURL)
	if err != nil {
		return nil, fmt.Errorf("bangchak fetch: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("bangchak read: %w", err)
	}

	// Response is an array with one object
	var arr []bangchakResponse
	if err := json.Unmarshal(body, &arr); err != nil {
		return nil, fmt.Errorf("bangchak json: %w", err)
	}
	if len(arr) == 0 || arr[0].OilList == "" {
		return nil, fmt.Errorf("bangchak: empty OilList")
	}

	// OilList is a JSON string inside JSON — double parse
	var oils []bangchakOil
	if err := json.Unmarshal([]byte(arr[0].OilList), &oils); err != nil {
		return nil, fmt.Errorf("bangchak OilList parse: %w", err)
	}

	var prices []models.FuelPrice
	for _, oil := range oils {
		fuelType, ok := bangchakNameToFuelType[oil.OilName]
		if !ok || oil.PriceToday <= 0 {
			continue
		}
		prices = append(prices, models.FuelPrice{
			Brand:    "บางจาก",
			FuelType: fuelType,
			Price:    oil.PriceToday,
		})
	}

	log.Printf("Bangchak: fetched %d fuel prices", len(prices))
	return prices, nil
}

// FetchAllPrices fetches from both sources and returns combined results
func FetchAllPrices() []models.FuelPrice {
	var all []models.FuelPrice

	if prices, err := FetchPTTORPrices(); err != nil {
		log.Printf("PTTOR price fetch error: %v", err)
	} else {
		all = append(all, prices...)
	}

	if prices, err := FetchBangchakPrices(); err != nil {
		log.Printf("Bangchak price fetch error: %v", err)
	} else {
		all = append(all, prices...)
	}

	return all
}
