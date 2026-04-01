package com.ev.AI_battery.service;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.apache.fontbox.util.BoundingBox;
import org.springframework.stereotype.Service;

@Service
public class LocationService {

    private static final int EARTH_RADIUS_KM = 6371;


    public double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);

        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return EARTH_RADIUS_KM * c;
    }


    public boolean isWithinRadius(double lat1, double lon1, double lat2, double lon2, double radiusKm) {
        return calculateDistance(lat1, lon1, lat2, lon2) <= radiusKm;
    }


    public BoundingBox calculateBoundingBox(double latitude, double longitude, double radiusKm) {
        double latDelta = Math.toDegrees(radiusKm / EARTH_RADIUS_KM);
        double lonDelta = Math.toDegrees(radiusKm / (EARTH_RADIUS_KM * Math.cos(Math.toRadians(latitude))));

        return new BoundingBox(
                latitude - latDelta,
                latitude + latDelta,
                longitude - lonDelta,
                longitude + lonDelta
        );
    }

    @Getter
    @AllArgsConstructor
    public static class BoundingBox {
        private double minLat;
        private double maxLat;
        private double minLon;
        private double maxLon;
    }

}