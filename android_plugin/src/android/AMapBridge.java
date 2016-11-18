package cn.imaq.missionhelper;

import com.amap.api.location.AMapLocation;
import com.amap.api.location.AMapLocationClient;
import com.amap.api.location.AMapLocationClientOption;
import com.amap.api.location.AMapLocationListener;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class AMapBridge extends CordovaPlugin {
    private AMapLocationClient locationClient = null;
    private CallbackContext callbackContext = null;

    @Override
    public void initialize(CordovaInterface cordova, CordovaWebView webView) {
        super.initialize(cordova, webView);
        locationClient = new AMapLocationClient(cordova.getActivity().getApplicationContext());
        AMapLocationClientOption locationClientOption = new AMapLocationClientOption();
        locationClientOption.setGpsFirst(true);
        locationClientOption.setInterval(1000);
        locationClient.setLocationOption(locationClientOption);
        locationClient.setLocationListener(new AMapLocationListener() {
            @Override
            public void onLocationChanged(AMapLocation aMapLocation) {
                if (callbackContext != null && aMapLocation != null && aMapLocation.getErrorCode() == 0) {
                    try {
                        float lat = (float) aMapLocation.getLatitude();
                        float lng = (float) aMapLocation.getLongitude();
                        JSONObject result = new JSONObject();
                        result.put("lat", lat);
                        result.put("lng", lng);
                        callbackContext.success(result);
                        callbackContext = null;
                    } catch (Exception e) {
                        callbackContext.error("");
                    }
                }
            }
        });
        locationClient.startLocation();
    }

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        if (action.equals("getLocation")) {
            this.callbackContext = callbackContext;
            return true;
        }
        return false;
    }
}
