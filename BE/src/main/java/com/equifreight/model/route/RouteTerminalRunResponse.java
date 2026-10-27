package com.equifreight.model.route;

import java.util.UUID;
import lombok.Builder;

/**
 * A local road run within one city, between the customer's stable and the airport's cargo terminal, before or after a
 * flight (US-F3-22): "Đại Nam Racecourse → TCS cargo terminal, Tân Sơn Nhất (SGN)".
 */
@Builder
public record RouteTerminalRunResponse(
        UUID corridorId, String code, String city, String fromPlace, String toPlace, Integer distanceKm) {}
