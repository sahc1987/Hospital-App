package com.hms.service;

import com.hms.dto.pharmacy.PharmacyItemRequest;
import com.hms.entity.PharmacyItem;
import com.hms.exception.ResourceNotFoundException;
import com.hms.repository.PharmacyItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PharmacyService {

    private final PharmacyItemRepository repo;

    @Transactional(readOnly = true)
    public Page<PharmacyItem> findAll(String name, Pageable pageable) {
        if (name != null && !name.isBlank()) {
            return repo.findByNameContainingIgnoreCase(name, pageable);
        }
        return repo.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public List<PharmacyItem> findLowStock() {
        return repo.findLowStock();
    }

    @Transactional
    @CacheEvict(value = "dashboard", allEntries = true)
    public PharmacyItem create(PharmacyItemRequest request) {
        PharmacyItem item = PharmacyItem.builder()
                .name(request.name())
                .category(request.category())
                .unitPrice(request.unitPrice())
                .stockQuantity(request.stockQuantity() != null ? request.stockQuantity() : 0)
                .reorderLevel(request.reorderLevel() != null ? request.reorderLevel() : 10)
                .build();
        return repo.save(item);
    }

    @Transactional
    public PharmacyItem update(Long id, PharmacyItemRequest request) {
        PharmacyItem item = repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PharmacyItem", id));
        item.setName(request.name());
        item.setCategory(request.category());
        item.setUnitPrice(request.unitPrice());
        if (request.stockQuantity() != null) item.setStockQuantity(request.stockQuantity());
        if (request.reorderLevel() != null) item.setReorderLevel(request.reorderLevel());
        return repo.save(item);
    }

    @Transactional
    @CacheEvict(value = "dashboard", allEntries = true)
    public PharmacyItem restock(Long id, int quantity) {
        if (quantity <= 0) throw new com.hms.exception.BadRequestException("Quantity must be positive");
        PharmacyItem item = repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PharmacyItem", id));
        item.setStockQuantity(item.getStockQuantity() + quantity);
        return repo.save(item);
    }
}
