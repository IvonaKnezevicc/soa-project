package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type PaymentClient interface {
	CreateWallet(ctx context.Context, touristID string) error
}

type paymentClient struct {
	baseURL    string
	httpClient *http.Client
}

func NewPaymentClient(baseURL string) PaymentClient {
	return &paymentClient{
		baseURL: strings.TrimRight(baseURL, "/"),
		httpClient: &http.Client{
			Timeout: 8 * time.Second,
		},
	}
}

func (c *paymentClient) CreateWallet(ctx context.Context, touristID string) error {
	payload, err := json.Marshal(map[string]string{
		"touristId": strings.TrimSpace(touristID),
	})
	if err != nil {
		return err
	}

	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		c.baseURL+"/api/payment/internal/wallets",
		bytes.NewReader(payload),
	)
	if err != nil {
		return err
	}
	request.Header.Set("Content-Type", "application/json")

	response, err := c.httpClient.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusCreated && response.StatusCode != http.StatusOK {
		return fmt.Errorf("payment service returned status %d", response.StatusCode)
	}

	return nil
}
