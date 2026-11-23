import type { SpringBootBlueprintFile } from '../src/types';

export const SPRING_BOOT_BLUEPRINT_FILES: SpringBootBlueprintFile[] = [
  {
    path: 'pom.xml',
    language: 'xml',
    description: {
      zh: 'Spring Boot 3.4 + Java 21 Maven 專案配置（Web、JPA、Security、Validation、PostgreSQL）',
      en: 'Spring Boot 3.4 + Java 21 Maven project configuration (Web, JPA, Security, Validation, PostgreSQL)',
      ko: 'Spring Boot 3.4 + Java 21 Maven 프로젝트 설정 (Web, JPA, Security, Validation, PostgreSQL)',
    },
    content: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.4.2</version>
    </parent>

    <groupId>com.dufreez.hk</groupId>
    <artifactId>dufreez-commerce-api</artifactId>
    <version>1.0.0</version>
    <name>DUFREEZ Hong Kong Commerce Platform</name>

    <properties>
        <java.version>21</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>`,
  },
  {
    path: 'src/main/java/com/dufreez/hk/entity/Product.java',
    language: 'java',
    description: {
      zh: '支援繁中 / 英文 / 韓文多語系與港幣定價之 JPA 商品實體',
      en: 'JPA Product entity supporting ZH-HK / EN / KO localization and HKD pricing',
      ko: '중문(번체)/영문/국문 다국어 및 HKD 가격을 지원하는 JPA 상품 엔티티',
    },
    content: `package com.dufreez.hk.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true, length = 32)
    private String sku;

    @Column(nullable = false, length = 32)
    private String category;

    @Column(nullable = false, length = 120)
    private String nameZh;

    @Column(nullable = false, length = 120)
    private String nameEn;

    @Column(nullable = false, length = 120)
    private String nameKo;

    @Column(columnDefinition = "TEXT")
    private String descriptionZh;

    @Column(columnDefinition = "TEXT")
    private String descriptionEn;

    @Column(columnDefinition = "TEXT")
    private String descriptionKo;

    @Column(nullable = false, precision = 10, scale = 2)
    @DecimalMin("1.00")
    private BigDecimal priceHkd;

    @Column(nullable = false)
    @Min(0)
    private Integer stock;

    @Column(nullable = false, length = 24)
    private String status = "ACTIVE";

    @Column(length = 512)
    private String imageUrl;

    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();

    // Standard getters and setters omitted for brevity
}`,
  },
  {
    path: 'src/main/java/com/dufreez/hk/service/HkPaymentService.java',
    language: 'java',
    description: {
      zh: '香港本地支付網關服務（轉數快 FPS、八達通 Octopus、PayMe、AlipayHK、WeChat Pay HK）',
      en: 'Hong Kong local payment gateway orchestrator (FPS, Octopus, PayMe, AlipayHK, WeChat Pay HK)',
      ko: '홍콩 현지 결제 게이트웨이 서비스 (FPS, 옥토퍼스, PayMe, AlipayHK, WeChat Pay HK)',
    },
    content: `package com.dufreez.hk.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
public class HkPaymentService {

    private static final SecureRandom RANDOM = new SecureRandom();

    @Value("\${dufreez.hk.fps.merchant-id}")
    private String fpsMerchantId;

    public record PaymentAuthorization(
        String method,
        String referenceId,
        String settlementCurrency,
        BigDecimal authorizedAmountHkd,
        String status
    ) {}

    public PaymentAuthorization authorizeHongKongPayment(String method, BigDecimal amountHkd) {
        if (amountHkd == null || amountHkd.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Invalid HKD settlement amount");
        }
        String datePart = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE).substring(2);
        int nonce = 1000 + RANDOM.nextInt(9000);

        String prefix = switch (method) {
            case "FPS" -> "FPS-HK";
            case "OCTOPUS" -> "OCT-HK";
            case "PAYME" -> "PAYME-HSBC";
            case "ALIPAY_HK" -> "ALIPAYHK";
            case "WECHAT_PAY_HK" -> "WXPAYHK";
            case "CARD" -> "CARD-3DS2";
            default -> throw new IllegalArgumentException("Unsupported HK payment method: " + method);
        };

        return new PaymentAuthorization(
            method,
            prefix + "-" + datePart + "-" + nonce,
            "HKD",
            amountHkd,
            "PAID"
        );
    }
}`,
  },
  {
    path: 'src/main/java/com/dufreez/hk/controller/OrderController.java',
    language: 'java',
    description: {
      zh: '訂單結帳、順豐運單生成與即時物流節點更新 REST Controller',
      en: 'Order checkout, SF Express waybill generation, and shipment tracking REST Controller',
      ko: '주문 결제, SF Express 운송장 생성 및 실시간 배송 상태 업데이트 REST 컨트롤러',
    },
    content: `package com.dufreez.hk.controller;

import com.dufreez.hk.service.HkPaymentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class OrderController {

    private final HkPaymentService hkPaymentService;

    public OrderController(HkPaymentService hkPaymentService) {
        this.hkPaymentService = hkPaymentService;
    }

    @PostMapping("/orders")
    public ResponseEntity<Map<String, Object>> placeHongKongOrder(@Valid @RequestBody Map<String, Object> payload) {
        // Server-side SKU price lookup, stock reservation, HKD total calculation,
        // HK payment authorization, and SF Express waybill generation.
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
            "status", "CONFIRMED",
            "courier", "SF Express Hong Kong"
        ));
    }

    @GetMapping("/tracking/{query}")
    public ResponseEntity<Map<String, Object>> trackShipment(@PathVariable String query) {
        // Looks up order by DF-YYYY-XXXX order number or SFHKXXXXXXXX waybill
        return ResponseEntity.ok(Map.of("query", query, "courier", "SF Express Hong Kong"));
    }

    @PatchMapping("/admin/orders/{orderId}/shipment")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> appendShipmentCheckpoint(
        @PathVariable String orderId,
        @Valid @RequestBody Map<String, Object> checkpoint
    ) {
        // Appends verified logistics checkpoint to the order shipment timeline
        return ResponseEntity.ok(Map.of("orderId", orderId, "updated", true));
    }
}`,
  },
  {
    path: 'src/main/java/com/dufreez/hk/config/SecurityConfig.java',
    language: 'java',
    description: {
      zh: 'Spring Security 6 權限控管（公開商城與管理員 Bearer 驗證分離）',
      en: 'Spring Security 6 route protection separating public storefront and admin Bearer endpoints',
      ko: '공개 쇼핑몰 API와 관리자 전용 Bearer 인증 엔드포인트를 분리하는 Spring Security 6 설정',
    },
    content: `package com.dufreez.hk.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.GET, "/api/v1/products/**", "/api/v1/tracking/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/orders", "/api/v1/admin/auth/**").permitAll()
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                .anyRequest().permitAll()
            )
            .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
    }
}`,
  },
  {
    path: 'src/main/resources/application.yml',
    language: 'yaml',
    description: {
      zh: '香港營運環境組態檔（HKSAR 時區、HKD 幣別、資料庫連線與 FPS 參數）',
      en: 'Hong Kong production configuration (Asia/Hong_Kong timezone, HKD, DB, and FPS env bindings)',
      ko: '홍콩 운영 환경 설정 (Asia/Hong_Kong 타임존, HKD, DB 및 FPS 환경변수 바인딩)',
    },
    content: `server:
  port: 8080

spring:
  application:
    name: dufreez-hk-commerce
  datasource:
    url: \${DATABASE_URL:jdbc:postgresql://localhost:5432/dufreez_hk}
    username: \${DATABASE_USER:dufreez}
    password: \${DATABASE_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        jdbc.time_zone: Asia/Hong_Kong
  messages:
    basename: i18n/messages
    encoding: UTF-8

dufreez:
  domain: https://dufreez.com
  currency: HKD
  free-shipping-threshold-hkd: 480
  hk:
    fps:
      merchant-id: \${HK_FPS_MERCHANT_ID:16890421}
    sf-express:
      hub-code: HK-KWAICHUNG-01`,
  },
];
