package ru.krugovoj.pohod;

import android.app.Activity;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ConsumeParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CapacitorPlugin(name = "PlayBilling")
public class PlayBillingPlugin extends Plugin implements PurchasesUpdatedListener {

    private BillingClient billingClient;
    private boolean billingReady = false;
    private PluginCall pendingPurchaseCall;
    private final Map<String, ProductDetails> productCache = new HashMap<>();

    @PluginMethod
    public void initialize(PluginCall call) {
        if (billingClient != null) {
            JSObject ret = new JSObject();
            ret.put("ready", billingReady);
            call.resolve(ret);
            return;
        }

        billingClient = BillingClient.newBuilder(getContext())
            .setListener(this)
            .enablePendingPurchases(
                com.android.billingclient.api.PendingPurchasesParams.newBuilder()
                    .enableOneTimeProducts()
                    .build()
            )
            .build();

        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                billingReady = billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK;
                JSObject ret = new JSObject();
                ret.put("ready", billingReady);
                ret.put("code", billingResult.getResponseCode());
                call.resolve(ret);
            }

            @Override
            public void onBillingServiceDisconnected() {
                billingReady = false;
            }
        });
    }

    @PluginMethod
    public void getProducts(PluginCall call) {
        if (!billingReady || billingClient == null) {
            call.reject("Billing not ready");
            return;
        }

        JSArray idsArray = call.getArray("productIds");
        if (idsArray == null || idsArray.length() == 0) {
            call.reject("productIds required");
            return;
        }

        List<QueryProductDetailsParams.Product> queryProducts = new ArrayList<>();
        for (int i = 0; i < idsArray.length(); i++) {
            try {
                String productId = idsArray.getString(i);
                if (productId == null || productId.isEmpty()) continue;
                queryProducts.add(
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(productId)
                        .setProductType(BillingClient.ProductType.INAPP)
                        .build()
                );
            } catch (Exception ignored) {
                // skip invalid id
            }
        }

        if (queryProducts.isEmpty()) {
            call.reject("No valid productIds");
            return;
        }

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(queryProducts)
            .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, detailsList) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                call.reject("Query failed: " + billingResult.getResponseCode());
                return;
            }

            productCache.clear();
            JSArray products = new JSArray();
            for (ProductDetails details : detailsList) {
                productCache.put(details.getProductId(), details);
                JSObject item = new JSObject();
                item.put("id", details.getProductId());
                ProductDetails.OneTimePurchaseOfferDetails offer = details.getOneTimePurchaseOfferDetails();
                if (offer != null) {
                    item.put("price", offer.getFormattedPrice());
                    item.put("priceAmountMicros", offer.getPriceAmountMicros());
                }
                products.put(item);
            }

            JSObject ret = new JSObject();
            ret.put("products", products);
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        String productId = call.getString("productId");
        if (productId == null || productId.isEmpty()) {
            call.reject("productId required");
            return;
        }
        if (!billingReady || billingClient == null) {
            call.reject("Billing not ready");
            return;
        }

        ProductDetails cached = productCache.get(productId);
        if (cached != null) {
            launchPurchase(call, cached);
            return;
        }

        List<QueryProductDetailsParams.Product> queryProducts = new ArrayList<>();
        queryProducts.add(
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId)
                .setProductType(BillingClient.ProductType.INAPP)
                .build()
        );

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(queryProducts)
            .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, detailsList) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK
                || detailsList.isEmpty()) {
                call.reject("Product not found: " + productId);
                return;
            }
            ProductDetails details = detailsList.get(0);
            productCache.put(details.getProductId(), details);
            launchPurchase(call, details);
        });
    }

    private void launchPurchase(PluginCall call, ProductDetails details) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("No activity");
            return;
        }

        pendingPurchaseCall = call;

        List<BillingFlowParams.ProductDetailsParams> productDetailsParamsList = new ArrayList<>();
        productDetailsParamsList.add(
            BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(details)
                .build()
        );

        BillingFlowParams flowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(productDetailsParamsList)
            .build();

        BillingResult result = billingClient.launchBillingFlow(activity, flowParams);
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            pendingPurchaseCall = null;
            call.reject("Launch failed: " + result.getResponseCode());
        }
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult billingResult, @Nullable List<Purchase> purchases) {
        if (pendingPurchaseCall == null) return;

        PluginCall call = pendingPurchaseCall;
        pendingPurchaseCall = null;

        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            JSObject ret = new JSObject();
            ret.put("cancelled", true);
            call.resolve(ret);
            return;
        }

        if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK || purchases == null) {
            call.reject("Purchase failed: " + billingResult.getResponseCode());
            return;
        }

        for (Purchase purchase : purchases) {
            if (purchase.getPurchaseState() != Purchase.PurchaseState.PURCHASED) continue;

            ConsumeParams consumeParams = ConsumeParams.newBuilder()
                .setPurchaseToken(purchase.getPurchaseToken())
                .build();

            billingClient.consumeAsync(consumeParams, (consumeResult, purchaseToken) -> {
                // ignore consume errors for grant flow
            });

            JSObject ret = new JSObject();
            if (!purchase.getProducts().isEmpty()) {
                ret.put("productId", purchase.getProducts().get(0));
            }
            ret.put("orderId", purchase.getOrderId());
            call.resolve(ret);
            return;
        }

        call.reject("Purchase not completed");
    }
}
