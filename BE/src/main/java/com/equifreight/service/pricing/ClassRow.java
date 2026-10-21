package com.equifreight.service.pricing;

import com.equifreight.entity.enums.ServiceClass;
import java.math.BigDecimal;
import java.util.UUID;

/** An air stall class on one corridor: the width it gives each horse and the price of one 96 in position. */
public record ClassRow(UUID id, ServiceClass serviceClass, int widthPerHorseIn, BigDecimal positionRate) {}
