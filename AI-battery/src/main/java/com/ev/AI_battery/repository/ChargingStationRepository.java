package com.ev.AI_battery.repository;

import com.ev.AI_battery.model.ChargingStation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ChargingStationRepository extends JpaRepository<ChargingStation, Long> {

    @Query(value = """
        SELECT *, 
        (6371 * acos(cos(radians(:lat)) * cos(radians(latitude)) * 
        cos(radians(longitude) - radians(:lon)) + sin(radians(:lat)) * 
        sin(radians(latitude)))) AS distance 
        FROM charging_stations 
        WHERE is_operational = true 
        HAVING distance < :radius 
        ORDER BY distance""", nativeQuery = true)
    List<ChargingStation> findStationsWithinRadius(
            @Param("lat") Double latitude,
            @Param("lon") Double longitude,
            @Param("radius") Double radiusKm
    );

    @Query(value = """
        SELECT * FROM charging_stations 
        WHERE connector_types LIKE %:connectorType% 
        AND max_power_kw >= :minPower 
        AND is_operational = true""", nativeQuery = true)
    List<ChargingStation> findByConnectorTypeAndMinPower(
            @Param("connectorType") String connectorType,
            @Param("minPower") Double minPower
    );

    @Query(value = """
        SELECT * FROM charging_stations 
        WHERE network_operator = :operator 
        AND is_operational = true""", nativeQuery = true)
    List<ChargingStation> findByNetworkOperator(@Param("operator") String operator);

    List<ChargingStation> findByReliabilityScoreGreaterThanEqual(Double minScore);
}